interface options {
    name?: string;
    nodeArgs?: any[];
    args?: any[];
    signal?: false | true | 'SIGUSR2';
    keyboard?: true | false;
    restartable?: true | false;
}
declare class RunServerPlugin {
    options: options;
    worker: any;
    _entryPoint: any;
    constructor(options?: options);
    _enableRestarting: () => void;
    _getArgs: () => string[];
    _startServer: (callback: any) => void;
    _getInspectPort: (execArgv: string[]) => number | undefined;
    _getSignal: () => "SIGUSR2" | undefined;
    afterEmit: (compilation: any, callback: () => {}) => {} | undefined;
    apply: (compiler: any) => void;
    startServer: (compilation: any, callback: () => {}) => void;
}
export default RunServerPlugin;
