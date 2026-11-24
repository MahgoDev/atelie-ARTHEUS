import {fileURLToPath} from 'node:url';
import {writeWorker} from './scripts/build.mjs';
export default {
  base:'/Atelie-ARTHEUS/',
  plugins:[{
    name:'atelie-cache-local',
    apply:'build',
    closeBundle(){return writeWorker(fileURLToPath(new URL('./dist/',import.meta.url)));}
  }]
};

