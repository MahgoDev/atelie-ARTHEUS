export const toolsMenu = [
    ['grimorio', 'Meu Grimório', 'Identidade artística', 'Explore seu manifesto, seus pilares e seu DNA visual.'],
    ['magia', 'A Magia de Criar', 'Minibook', 'Reencontre a liberdade de criar, uma página por vez.'],
    ['ficha', 'Ficha de Criação', 'Criação', 'Dê forma a uma ideia, da primeira faísca à paleta.'],
    ['avaliacao', 'Avaliação Artística', 'Reflexão', 'Revisite suas escolhas e o que aprendeu com uma obra.'],
    ['filtro', 'Filtro Criativo', 'Reflexão', 'Escute o que está por trás de uma vontade de desenhar.'],
    ['ideias', 'Banco de Ideias', 'Inspiração', 'Guarde possibilidades e descubra um ponto de partida.']
];
export const categories = ['Prisma', 'MusicArt', 'Bloodlines', 'Estudos', 'Fanart', 'Original', 'Outras'];
export const ideaCategories = ['Prisma', 'MusicArt', 'Bloodlines', 'Magia e fantasia', 'Moda', 'Relações humanas', 'Estudos', 'Fanarts reinterpretadas', 'Capas de livros', 'Capas de álbuns'];
export const seeds = [
    ['Prisma', 'Depois da chuva', 'Duas personagens de Prisma dividem um guarda-chuva. Mostre quem cuida de quem pelo jeito como cada uma segura o cabo.'],
    ['MusicArt', 'Se a música tivesse um rosto', 'Escolha uma faixa que você ouviu no caminho para casa. Transforme o timbre em tecido e a batida em gesto.'],
    ['Bloodlines', 'Um retrato em duas luzes', 'Experimente um retrato para Bloodlines em que a luz da rua e a de uma janela revelem duas leituras da mesma expressão.'],
    ['Magia e fantasia', 'O último ônibus', 'Uma bruxa urbana espera no ponto. Só o reflexo na poça entrega o feitiço que acabou de lançar.'],
    ['Moda', 'Um poder costurado à mão', 'Desenhe um figurino que sugira um poder mágico pela construção das mangas e pelo peso do tecido.'],
    ['Relações humanas', 'Antes de entrar em cena', 'Duas pessoas se preparam diante do espelho. Uma ajeita a gola da outra. O que suas mãos contam?'],
    ['Estudos', 'Três bordas para um rosto', 'Pinte a mesma expressão com bordas nítidas, difusas e perdidas. Escolha onde o olhar deve parar.'],
    ['Fanarts reinterpretadas', 'Uma tarde comum', 'Leve uma personagem que você ama a uma feira de bairro. Preserve sua personalidade por meio do gesto e da silhueta.'],
    ['Capas de livros', 'A flor do outro lado', 'Crie uma capa em que uma flor atravessa a fresta de uma porta. Reserve espaço para o título e insinue o mistério pela sombra.'],
    ['Capas de álbuns', 'O silêncio depois da faixa', 'Imagine a última faixa de um disco como uma sala vazia. Que objeto ainda guarda a presença de quem cantou?'],
    ['Prisma', 'Um ensaio entre amigas', 'Explore a possibilidade de um treino de magia que dá errado. Escolha o instante em que o susto vira cumplicidade.'],
    ['MusicArt', 'Luz de camarim', 'Traduza o refrão de uma música em luz, maquiagem e uma expressão observada pelo espelho.']
].map(([category, title, idea], i) => ({ id: 'seed-' + i, category, title, idea }));
export const fields = [
    ['idea', 'Ideia'], ['motivation', 'Motivação'], ['characters', 'Personagens'], ['context', 'Contexto narrativo'], ['atmosphere', 'Atmosfera'], ['message', 'O que desejo transmitir'], ['interpretation', 'Interpretação pessoal'], ['composition', 'Composição'], ['outfit', 'Figurino'], ['lighting', 'Iluminação'], ['skill', 'Habilidade que desejo explorar'], ['references', 'Referências em texto ou links'], ['notes', 'Anotações']
];
export const finishes = {
    'Leve': 'Cores-base, sombras simples, iluminação sugerida e expressão legível.',
    'Narrativo': 'Interações, ambiente contextualizado e atmosfera.',
    'Destaque': 'Direção de arte refinada, efeitos e textura seletiva.'
};
export const criteria = [['Autenticidade', 'Eu queria criar isso?'], ['Narrativa', 'Comuniquei o contexto?'], ['Identidade', 'Reconheço minhas escolhas?'], ['Aprendizado', 'Experimentei algo?'], ['Satisfação', 'Cumpri a proposta?']];
export const questions = ['Eu desenharia isso mesmo se não pudesse publicar?', 'Existe algo nessa ideia que me desperta curiosidade?', 'Tenho liberdade para interpretar essa ideia do meu jeito?', 'Estou escolhendo isso por vontade, e não exclusivamente por medo de ter pouco alcance?', 'Estou disposto a aceitar um acabamento compatível com a proposta?'];
