
import * as Path from 'path';

import {readTomlFile} from './Util';
import commandLineArgs from './CommandLineArgs';

export interface Configs {
    default_command?: string
}

const _cachedConfigs = {}

export function readTomlFileOptional(filename:string) : Promise<any | null> {
    return readTomlFile(filename)
        .catch((e) => {
            if (e.code === 'ENOENT')
                return null;
            return Promise.reject(e);
        });
}

export async function getDerivedConfigsForDir(dir:string) : Promise<Configs> {

    if (_cachedConfigs[dir]) {
        console.log('found cache for', dir, _cachedConfigs[dir]);
        return JSON.parse(_cachedConfigs[dir]);
    }

    const parentDir = Path.dirname(dir);
    const configs:Configs = {
    };

    if (parentDir !== dir) {
        const parentConfigs = await getDerivedConfigsForDir(parentDir);

        for (const key in parentConfigs)
            configs[key] = parentConfigs[key];
    }

    const configFile = await readTomlFileOptional(Path.join(dir, 'stdout-test.toml'));

    if (configFile !== null) {
        for (const key in configFile)
            configs[key] = configFile[key];
    }

    _cachedConfigs[dir] = JSON.stringify(configs);

    return configs;
}
