Object.defineProperty(exports, '__esModule', {
  value: true
});

import * as _cluster from 'cluster';

const _cluster2 = _interopRequireDefault(_cluster);

function _interopRequireDefault(obj: any) {
  return obj && obj.__esModule ? obj : { default: obj };
}

// interface RunServerPlugin {
//   _enableRestarting(): void;
//   _getArgs(): void;
//   _getInspectPort(execArgv: any[]): number;
//   _getSignal(): boolean | string;
//   afterEmit(): any;
//   apply(): void;
//   startServer(): void;
//   _startServer(): void;
// }
interface options {
  name?: string;
  nodeArgs?: any[]; // allow debugging
  args?: any[]; // pass args to script
  signal?: false | true | 'SIGUSR2'; // signal to send for HMR (defaults to `false`, uses 'SIGUSR2' if `true`)
  keyboard?: true | false;
  restartable?: true | false;
}

interface setting {
  execArgv?: string[]; //传给 Node.js 可执行文件的字符串参数列表。默认值: process.execArgv。
  exec?: string; //工作进程的文件路径。默认值: process.argv[1]。
  args?: string[]; //传给工作进程的字符串参数。默认值: process.argv.slice(2)。
  cwd?: string; //工作进程的当前工作目录。默认值: undefined（从父进程继承）。
  silent?: boolean; //是否需要发送输出到父进程的 stdio。默认值: false。
  stdio?: any[]; // 配置衍生的进程的 stdio。 由于 cluster 模块运行依赖于 IPC，这个配置必须包含 'ipc'。如果提供了这个选项，则覆盖 silent。
  uid?: number; // 设置进程的用户标识符。参阅 setuid(2)。
  gid?: number; //设置进程的群组标识符。参阅 setgid(2)。
  inspectPort?: number | Function; //设置工作进程的检查端口。这可以是一个数字、或不带参数并返回数字的函数。默认情况下，每个工作进程都有自己的端口，从主进程的 process.debugPort 开始递增。
  windowsHide?: boolean; //隐藏衍生的进程的控制台窗口（通常在 Windows 系统上会创建）。默认值: false。
}
class RunServerPlugin {
  public options: options;
  public worker: any;
  public _entryPoint: any;
  constructor(options: options = {}) {
    this.options = Object.assign(
      {
        signal: false,
        // Only listen on keyboard in development, so the server doesn't hang forever
        keyboard: process.env.NODE_ENV === 'development'
      },
      options
    );

    this.worker = null;
    if (this.options.restartable !== false) {
      this._enableRestarting();
    }
  }

  public _enableRestarting = () => {
    if (this.options.keyboard) {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (data: any) => {
        if (data.trim() === 'rs') {
          console.log('Restarting app...');
          process.kill(this.worker.process.pid);
          this._startServer((worker: any): void => {
            this.worker = worker;
          });
        }
      });
    }
  };

  public _getArgs = (): string[] => {
    const options = this.options;
    const execArgv: string[] = (options.nodeArgs || []).concat(
      process.execArgv
    );
    if (options.args) {
      execArgv.push('--');
      execArgv.push.apply(execArgv, options.args);
    }
    return execArgv;
  };

  public _startServer = (callback: any) => {
    const execArgv = this._getArgs();
    const inspectPort = this._getInspectPort(execArgv);
    const clusterOptions: setting = {
      exec: this._entryPoint,
      // execArgv
      args: execArgv
    };

    if (inspectPort) {
      clusterOptions.inspectPort = inspectPort;
    }
    _cluster2.default.setupMaster(clusterOptions);

    _cluster2.default.on('online', (worker: any) => {
      callback(worker);
    });

    _cluster2.default.fork();
  };

  public _getInspectPort = (execArgv: string[]): number | undefined => {
    const inspectArg = execArgv.find(arg => arg.includes('--inspect'));
    if (!inspectArg || !inspectArg.includes('=')) {
      return;
    }
    const hostPort = inspectArg.split('=')[1];
    const port = hostPort.includes(':') ? hostPort.split(':')[1] : hostPort;
    return parseInt(port);
  };

  public _getSignal = () => {
    const signal = this.options.signal;
    // allow users to disable sending a signal by setting to `false`...

    if (signal === false) return;
    if (signal === true) return 'SIGUSR2';
    return signal;
  };

  public afterEmit = (compilation: any, callback: () => {}) => {
    if (this.worker && this.worker.isConnected()) {
      const signal = this._getSignal();
      if (signal) {
        process.kill(this.worker.process.pid, signal);
      }
      return callback();
    }

    this.startServer(compilation, callback);
  };

  public apply = (compiler: any) => {
    // Use the Webpack 4 Hooks API when possible.
    if (compiler.hooks) {
      const plugin = { name: 'StartServerPlugin' };

      compiler.hooks.afterEmit.tapAsync(plugin, this.afterEmit);
    } else {
      compiler.plugin('after-emit', this.afterEmit);
    }
  };

  public startServer = (compilation: any, callback: () => {}) => {
    const options = this.options;

    let name;
    const names = Object.keys(compilation.assets);
    if (options.name) {
      name = options.name;
      if (!compilation.assets[name]) {
        console.error(
          'Entry ' + name + ' not found. Try one of: ' + names.join(' ')
        );
      }
    } else {
      name = names[0];
      if (names.length > 1) {
        console.log(
          'More than one entry built, selected ' +
            name +
            '. All names: ' +
            names.join(' ')
        );
      }
    }
    const existsAt = compilation.assets[name].existsAt;
    this._entryPoint = existsAt;

    this._startServer((worker: any): void => {
      this.worker = worker;
      callback();
    });
  };
}

export default RunServerPlugin;
