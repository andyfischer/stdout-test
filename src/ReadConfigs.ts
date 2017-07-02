
import {readTomlFile} from './Util'
import * as Path from 'path';

export interface Config {
    command?: string
}

const _cached = {}

export function readTomlFileOptional(filename:string) : Promise<any | null> {
    return readTomlFile(filename)
        .catch((e) => {
            if (e.code === 'ENOENT')
                return null;
            return Promise.reject(e);
        });
}

async function _getDerivedConfigsForDir(dir:string) : Promise<Config> {

    const parentDir = Path.dirname(dir);
    const configs = {};

    if (parentDir !== dir) {
        const parentConfigs = await getDerivedConfigsForDir(parentDir);

        for (const key in parentConfigs) {
            configs[key] = parentConfigs[key];
        }
    }

    const configFile = await readTomlFileOptional(Path.join(dir, 'stdout-test.toml'));
    if (configFile !== null) {
        for (const key in configFile) {
            configs[key] = configFile[key];
        }
    }

    return configs;
}

export function getDerivedConfigsForDir(dir:string) : Promise<Config> {
    if (_cached[dir])
        return _cached[dir];

    const result = _getDerivedConfigsForDir(dir);
    _cached[dir] = result;

    return result;
}
