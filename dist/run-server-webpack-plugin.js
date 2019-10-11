'use strict';
Object.defineProperty(exports, '__esModule', {
    value: true
});
var _cluster = require('cluster');
var _cluster2 = _interopRequireDefault(_cluster);
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}
var RunServerPlugin = /** @class */ (function () {
    function RunServerPlugin(options) {
        if (options == null) {
            options = {};
        }
        if (typeof options === 'string') {
            options = { name: options };
        }
        this.options = Object.assign({
            signal: false,
            // Only listen on keyboard in development, so the server doesn't hang forever
            keyboard: process.env.NODE_ENV === 'development'
        }, options);
        this.afterEmit = this.afterEmit.bind(this);
        this.apply = this.apply.bind(this);
        this.startServer = this.startServer.bind(this);
        this.worker = null;
        if (this.options.restartable !== false) {
            this._enableRestarting();
        }
    }
    RunServerPlugin.prototype._enableRestarting = function () {
        var _this = this;
        if (this.options.keyboard) {
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', function (data) {
                if (data.trim() === 'rs') {
                    console.log('Restarting app...');
                    process.kill(_this.worker.process.pid);
                    _this._startServer(function (worker) {
                        _this.worker = worker;
                    });
                }
            });
        }
    };
    RunServerPlugin.prototype._getArgs = function () {
        var options = this.options;
        var execArgv = (options.nodeArgs || []).concat(process.execArgv);
        console.log(execArgv, 1);
        if (options.args) {
            execArgv.push('--');
            execArgv.push.apply(execArgv, options.args);
        }
        return execArgv;
    };
    RunServerPlugin.prototype._getInspectPort = function (execArgv) {
        var inspectArg = execArgv.find(function (arg) { return arg.includes('--inspect'); });
        if (!inspectArg || !inspectArg.includes('=')) {
            return;
        }
        var hostPort = inspectArg.split('=')[1];
        var port = hostPort.includes(':') ? hostPort.split(':')[1] : hostPort;
        return parseInt(port);
    };
    RunServerPlugin.prototype._getSignal = function () {
        var signal = this.options.signal;
        // allow users to disable sending a signal by setting to `false`...
        if (signal === false)
            return;
        if (signal === true)
            return 'SIGUSR2';
        return signal;
    };
    RunServerPlugin.prototype.afterEmit = function (compilation, callback) {
        if (this.worker && this.worker.isConnected()) {
            var signal = this._getSignal();
            if (signal) {
                process.kill(this.worker.process.pid, signal);
            }
            return callback();
        }
        this.startServer(compilation, callback);
    };
    RunServerPlugin.prototype.apply = function (compiler) {
        // Use the Webpack 4 Hooks API when possible.
        if (compiler.hooks) {
            var plugin = { name: 'StartServerPlugin' };
            compiler.hooks.afterEmit.tapAsync(plugin, this.afterEmit);
        }
        else {
            compiler.plugin('after-emit', this.afterEmit);
        }
    };
    RunServerPlugin.prototype.startServer = function (compilation, callback) {
        var _this = this;
        var options = this.options;
        var name;
        var names = Object.keys(compilation.assets);
        if (options.name) {
            name = options.name;
            if (!compilation.assets[name]) {
                console.error('Entry ' + name + ' not found. Try one of: ' + names.join(' '));
            }
        }
        else {
            name = names[0];
            if (names.length > 1) {
                console.log('More than one entry built, selected ' +
                    name +
                    '. All names: ' +
                    names.join(' '));
            }
        }
        var existsAt = compilation.assets[name].existsAt;
        this._entryPoint = existsAt;
        this._startServer(function (worker) {
            _this.worker = worker;
            callback();
        });
    };
    RunServerPlugin.prototype._startServer = function (callback) {
        var execArgv = this._getArgs();
        var inspectPort = this._getInspectPort(execArgv);
        console.log(this._entryPoint, 11111, execArgv);
        var clusterOptions = {
            exec: this._entryPoint,
            // execArgv
            args: execArgv
        };
        // if (inspectPort) {
        //   clusterOptions.inspectPort = inspectPort;
        // }
        _cluster2.default.setupMaster(clusterOptions);
        _cluster2.default.on('online', function (worker) {
            callback(worker);
        });
        _cluster2.default.fork();
    };
    return RunServerPlugin;
}());
exports.default = RunServerPlugin;
module.exports = RunServerPlugin;
