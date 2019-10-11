"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
Object.defineProperty(exports, '__esModule', {
    value: true
});
var _cluster = require("cluster");
var _cluster2 = _interopRequireDefault(_cluster);
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}
var RunServerPlugin = /** @class */ (function () {
    function RunServerPlugin(options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this._enableRestarting = function () {
            if (_this.options.keyboard) {
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
        this._getArgs = function () {
            var options = _this.options;
            var execArgv = (options.nodeArgs || []).concat(process.execArgv);
            if (options.args) {
                execArgv.push('--');
                execArgv.push.apply(execArgv, options.args);
            }
            return execArgv;
        };
        this._startServer = function (callback) {
            var execArgv = _this._getArgs();
            var inspectPort = _this._getInspectPort(execArgv);
            var clusterOptions = {
                exec: _this._entryPoint,
                // execArgv
                args: execArgv
            };
            if (inspectPort) {
                clusterOptions.inspectPort = inspectPort;
            }
            _cluster2.default.setupMaster(clusterOptions);
            _cluster2.default.on('online', function (worker) {
                callback(worker);
            });
            _cluster2.default.fork();
        };
        this._getInspectPort = function (execArgv) {
            var inspectArg = execArgv.find(function (arg) { return arg.includes('--inspect'); });
            if (!inspectArg || !inspectArg.includes('=')) {
                return;
            }
            var hostPort = inspectArg.split('=')[1];
            var port = hostPort.includes(':') ? hostPort.split(':')[1] : hostPort;
            return parseInt(port);
        };
        this._getSignal = function () {
            var signal = _this.options.signal;
            // allow users to disable sending a signal by setting to `false`...
            if (signal === false)
                return;
            if (signal === true)
                return 'SIGUSR2';
            return signal;
        };
        this.afterEmit = function (compilation, callback) {
            if (_this.worker && _this.worker.isConnected()) {
                var signal = _this._getSignal();
                if (signal) {
                    process.kill(_this.worker.process.pid, signal);
                }
                return callback();
            }
            _this.startServer(compilation, callback);
        };
        this.apply = function (compiler) {
            // Use the Webpack 4 Hooks API when possible.
            if (compiler.hooks) {
                var plugin = { name: 'StartServerPlugin' };
                compiler.hooks.afterEmit.tapAsync(plugin, _this.afterEmit);
            }
            else {
                compiler.plugin('after-emit', _this.afterEmit);
            }
        };
        this.startServer = function (compilation, callback) {
            var options = _this.options;
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
            _this._entryPoint = existsAt;
            _this._startServer(function (worker) {
                _this.worker = worker;
                callback();
            });
        };
        this.options = Object.assign({
            signal: false,
            // Only listen on keyboard in development, so the server doesn't hang forever
            keyboard: process.env.NODE_ENV === 'development'
        }, options);
        this.worker = null;
        if (this.options.restartable !== false) {
            this._enableRestarting();
        }
    }
    return RunServerPlugin;
}());
exports.default = RunServerPlugin;
