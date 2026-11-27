
import { conflict, quoted } from './api.js';

export const folderType = 'application/vnd.google-apps.folder';
export const types = ['image/png', 'image/jpeg', 'image/webp'];
export const states = ['ideia', 'em andamento', 'finalizada'];

const app = 'artheus-acervo-1';

const defaultGalleries = [
    'Prisma',
    'MusicArt',
    'Bloodlines',
    'Estudos'
];

const marker = (role, extra = {}) => ({
    atelier: app,
    role,
    ...extra
});

const managed =
    "appProperties has { key='atelier' and value='" + app + "' }";

const children = id => quoted(id) + ' in parents';

const valid = (file, role, parent) =>
    file &&
    !file.trashed &&
    file.ownedByMe === true &&
    file.shared !== true &&
    file.appProperties?.atelier === app &&
    file.appProperties.role === role &&
    (
        role === 'work'
            ? types.includes(file.mimeType)
            : file.mimeType === folderType
    ) &&
    (!parent || file.parents?.includes(parent));


/* Validação dos campos */

const nameOf = value => {
    const name = String(value || '').trim();

    if (!name || name.length > 180) {
        throw Error('Use um título de 1 a 180 caracteres.');
    }

    return name;
};

function textField(value, limit, label) {
    if (typeof value !== 'string' || value.length > limit) {
        throw Error(
            label + ' excede o limite ou contém dados inválidos.'
        );
    }

    return value;
}


/* Processamento em pequenos lotes paralelos */

async function parallelMap(items, callback, limit = 4) {
    const results = [];

    for (let i = 0; i < items.length; i += limit) {
        const batch = items.slice(i, i + limit);

        const processed = await Promise.all(
            batch.map(callback)
        );

        results.push(...processed);
    }

    return results;
}


/* Metadados das obras */

export function workInfo(input) {
    const date = input.date;

    if (
        !/^\d{4}-\d\d-\d\d$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date
    ) {
        throw Error('Informe uma data válida.');
    }

    if (
        !Array.isArray(input.tags) ||
        input.tags.length > 30 ||
        !states.includes(input.status) ||
        typeof input.favorite !== 'boolean'
    ) {
        throw Error('Confira o status e as tags (até 30).');
    }

    return {
        format: 1,

        description: textField(
            input.description,
            3000,
            'A descrição'
        ),

        notes: textField(
            input.notes,
            6000,
            'As anotações'
        ),

        tags: [
            ...new Set(
                input.tags
                    .map(s => textField(s, 60, 'Uma tag').trim())
                    .filter(Boolean)
            )
        ],

        date,
        status: input.status,
        favorite: input.favorite
    };
}

export function decodeWork(file) {
    try {
        const raw = JSON.parse(file.description);

        if (raw.format !== 1) {
            throw Error();
        }

        return {
            ...file,
            info: workInfo(raw),
            damaged: false
        };

    } catch {
        return {
            ...file,
            damaged: true,

            info: {
                description: '',
                notes: '',
                tags: [],
                favorite: false,
                status: 'ideia',
                date: (file.createdTime || '').slice(0, 10)
            }
        };
    }
}

function encodeWork(input) {
    const description = JSON.stringify(workInfo(input));

    if (new Blob([description]).size > 24000) {
        throw Error(
            'Reduza as anotações ou as tags para caber nos metadados da obra.'
        );
    }

    return description;
}


/* Gerenciamento do acervo */

export class Collection {

    constructor(api) {
        this.api = api;
        this.warnings = new Set();
    }


    /* Localizar ou criar pastas */

    async ensure(parent, role, name, seed = '') {

        const query =
            children(parent || 'root') +
            ' and ' +
            managed +
            " and appProperties has { key='role' and value=" +
            quoted(role) +
            ' }' +
            (
                seed
                    ? " and appProperties has { key='seed' and value=" +
                      quoted(seed) + ' }'
                    : ''
            );

        const find = async () =>
            (await this.api.list(query))
                .filter(
                    f =>
                        valid(f, role, parent) &&
                        (!seed || f.appProperties.seed === seed)
                )
                .sort(
                    (a, b) =>
                        a.createdTime.localeCompare(b.createdTime) ||
                        a.id.localeCompare(b.id)
                );

        let list = await find();

        if (!list.length) {

            const made = await this.api.create({
                name,
                mimeType: folderType,
                appProperties: marker(
                    role,
                    seed ? { seed } : {}
                ),
                parents: [parent || 'root']
            });

            list = await find();

            if (!list.length) {
                list = [made];
            }
        }

        if (list.length > 1) {
            this.warnings.add(
                'Há pastas duplicadas no Drive. O Ateliê usa a estrutura mais antiga e preserva as demais para revisão.'
            );
        }

        return list[0];
    }


    /* Inicialização otimizada */

    async initialize() {

        this.root = await this.ensure(
            null,
            'root',
            'Ateliê ARTHEUS'
        );

        const [group] = await Promise.all([
            this.ensure(
                this.root.id,
                'group',
                'Galerias'
            ),

            this.ensure(
                this.root.id,
                'data',
                'Dados'
            )
        ]);

        this.group = group;

        /*
         * Consulta todas as galerias existentes de uma vez,
         * em vez de consultar cada galeria separadamente.
         */

        const folders = (
            await this.api.list(
                children(this.group.id) +
                ' and ' +
                managed
            )
        ).filter(
            f => valid(f, 'gallery', this.group.id)
        );

        const missing = defaultGalleries.filter(
            seed => !folders.some(
                f => f.appProperties.seed === seed
            )
        );

        /*
         * Somente cria ou verifica individualmente
         * as galerias que estiverem faltando.
         */

        await parallelMap(
            missing,
            seed => this.ensure(
                this.group.id,
                'gallery',
                seed,
                seed
            )
        );

        for (const seed of defaultGalleries) {
            if (
                folders.filter(
                    f => f.appProperties.seed === seed
                ).length > 1
            ) {
                this.warnings.add(
                    'Há pastas duplicadas no Drive. O Ateliê usa a estrutura mais antiga e preserva as demais para revisão.'
                );
            }
        }
    }


    /* Segurança e integridade */

    async guard(id, role, parent, version) {

        const file = await this.api.get(id);

        if (!valid(file, role, parent)) {
            throw Error(
                'Este item saiu da estrutura privada do Ateliê. Atualize o acervo.'
            );
        }

        if (
            version !== undefined &&
            file.version !== version
        ) {
            throw Error(conflict);
        }

        return file;
    }

    async tree() {

        const [, group] = await Promise.all([
            this.guard(this.root.id, 'root'),

            this.guard(
                this.group.id,
                'group',
                this.root.id
            )
        ]);

        return group;
    }

    async gallery(id, version) {

        const [, item] = await Promise.all([
            this.tree(),

            this.guard(
                id,
                'gallery',
                this.group.id,
                version
            )
        ]);

        if (item.appProperties.archived === '1') {
            throw Error(
                'A galeria foi removida. Atualize o acervo.'
            );
        }

        return item;
    }

    async artwork(work, version) {

        const parent = work.parents?.[0];

        if (!parent) {
            throw Error(
                'Não foi possível localizar a galeria da obra.'
            );
        }

        const [, file] = await Promise.all([
            this.gallery(parent),

            this.guard(
                work.id,
                'work',
                parent,
                version
            )
        ]);

        return file;
    }


    /* Carregamento otimizado do acervo */

    async snapshot() {

        await this.tree();

        const folders = (
            await this.api.list(
                children(this.group.id) +
                ' and ' +
                managed
            )
        ).filter(
            f => valid(f, 'gallery', this.group.id)
        );

        const galleries = [];
        const works = [];

        /*
         * Carrega até quatro galerias simultaneamente,
         * evitando excesso de requisições.
         */

        const loaded = await parallelMap(
            folders,

            async g => {

                const rows = (
                    await this.api.list(
                        children(g.id) +
                        ' and ' +
                        managed
                    )
                )
                    .filter(
                        f => valid(f, 'work', g.id)
                    )
                    .map(decodeWork);

                return {
                    gallery: g,
                    rows
                };
            }
        );

        for (const { gallery: g, rows } of loaded) {

            if (g.appProperties.archived === '1') {

                if (rows.length) {
                    this.warnings.add(
                        'Uma galeria removida recebeu uma obra em outro dispositivo. A pasta e a imagem foram preservadas no Drive.'
                    );
                }

                continue;
            }

            galleries.push(g);
            works.push(...rows);
        }

        return {
            galleries,
            works,
            warnings: [...this.warnings]
        };
    }


    /* Criação de galerias */

    async createGallery(name, description = '') {

        await this.tree();

        return this.api.create({
            name: nameOf(name),

            description: textField(
                description,
                3000,
                'A descrição'
            ),

            parents: [this.group.id],
            mimeType: folderType,
            appProperties: marker('gallery')
        });
    }


    /* Edição de galerias */

    async editGallery(
        original,
        name,
        description,
        cover
    ) {

        const g = await this.gallery(
            original.id,
            original.version
        );

        if (cover) {
            await this.guard(
                cover,
                'work',
                g.id
            );
        }

        return this.api.update(g, {

            name: nameOf(name),

            description: textField(
                description,
                3000,
                'A descrição'
            ),

            appProperties: {
                ...g.appProperties,
                cover: cover || null
            }
        });
    }


    /* Remoção segura de galerias */

    async removeGallery(original) {

        const g = await this.gallery(
            original.id,
            original.version
        );

        if (
            (await this.api.list(children(g.id))).length
        ) {
            throw Error(
                'Esta galeria contém arquivos. Mova cada obra para outra galeria ou remova os itens individualmente no Drive.'
            );
        }

        return this.api.update(g, {
            appProperties: {
                ...g.appProperties,
                archived: '1'
            }
        });
    }


    /* Upload de obras */

    async add(blob, input, progress) {

        if (
            !types.includes(blob.type) ||
            !blob.size ||
            blob.size > 32 * 1024 * 1024
        ) {
            throw Error(
                'Use PNG, JPEG ou WebP de até 32 MB.'
            );
        }

        const g = await this.gallery(input.gallery);

        return this.api.upload(
            {
                name: nameOf(input.title),
                description: encodeWork(input),
                mimeType: blob.type,
                parents: [g.id],
                appProperties: marker('work')
            },

            blob,
            progress
        );
    }


    /* Edição e movimentação de obras */

    async edit(original, input) {

        const [dest, work] = await Promise.all([
            this.gallery(input.gallery),

            this.artwork(
                original,
                original.version
            )
        ]);

        const parent = work.parents[0];

        return this.api.update(
            work,

            {
                name: nameOf(input.title),
                description: encodeWork(input)
            },

            parent === dest.id
                ? {}
                : {
                    addParents: dest.id,
                    removeParents: parent
                }
        );
    }


    /* Remoção de obras */

    async remove(original) {

        const work = await this.artwork(
            original,
            original.version
        );

        return this.api.update(work, {
            trashed: true
        });
    }


    /* Carregamento de imagens privadas */

    async image(work, signal) {

        signal?.throwIfAborted();

        const file = await this.artwork(work, work.version);

        if (
            Number(file.size) > 32 * 1024 * 1024
        ) {
            throw Error(
                'Imagem maior que o limite de visualização de 32 MB.'
            );
        }

        signal?.throwIfAborted();

        const blob = await this.api.media(
            file.id,
            signal
        );

        if (
            !types.includes(blob.type) ||
            blob.size > 32 * 1024 * 1024
        ) {
            throw Error(
                'Formato de imagem indisponível.'
            );
        }

        return blob;
    }
}
