
import * as Path from 'path';

import {readTomlFile} from './Util';
import commandLineArgs from './CommandLineArgs';
import {Options} from './Options';

const _cached = {}

export function readTomlFileOptional(filename:string) : Promise<any | null> {
    return readTomlFile(filename)
        .catch((e) => {
            if (e.code === 'ENOENT')
                return null;
            return Promise.reject(e);
        });
}

async function _getDerivedConfigsForDir(dir:string) : Promise<Options> {

    const parentDir = Path.dirname(dir);
    const configs:Options = {
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

    console.log('read configs: ', configs);

    return configs;
}

export function getDerivedConfigsForDir(dir:string) : Promise<Options> {
    if (_cached[dir])
        return _cached[dir];

    const result = _getDerivedConfigsForDir(dir);
    _cached[dir] = result;

    return result;
}
