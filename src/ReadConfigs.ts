
import * as Path from 'path';

import {readTomlFile} from './Util';
import commandLineArgs from './CommandLineArgs';
import {Configs} from './Configs';

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
        targetDirectories: []
    };

    if (parentDir !== dir) {
        const parentConfigs = await getDerivedConfigsForDir(parentDir);

        for (const key in parentConfigs)
            configs[key] = parentConfigs[key];
    }

    const configFile = await readTomlFileOptional(Path.join(dir, 'stdout-test.toml'));

    if (configFile !== null) {
        // Don't allow the config file to set certain options, these are command-line only.
        delete configFile['acceptOutput'];
        delete configFile['show'];

        for (const key in configFile)
            configs[key] = configFile[key];
    }

    // Include options from command-line args.
    const args = commandLineArgs();
    for (const key in args)
        configs[key] = args[key];

    _cachedConfigs[dir] = JSON.stringify(configs);

    return configs;
}
