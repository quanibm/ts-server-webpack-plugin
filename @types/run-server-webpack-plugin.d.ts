declare class RunServerPlugin {
  constructor(options: any);
  _enableRestarting(): void;
  _getArgs(): void;
  _getInspectPort(execArgv: any[]): number;
  _getSignal(): boolean | string;
  afterEmit(): any;
  apply(): void;
  startServer(): void;
  _startServer(): void;
}
declare namespace RunServerPlugin {}
export = RunServerPlugin;
