'use strict';

var winston = require('winston'),
    _ = require('lodash')
    ;

/** Hierarchical Winston logger
 *
 * @param {Object?} options
 *      The options object
 * @param {Object.<String, Number>?} options.levels
 *      Log levels to use.
 *      Default: winston.config.npm.levels
 * @param {Boolean|function(loggerName: String, message: String):String?} [decorate=false]
 *      Whether to decorate messages with the logger name.
 *      You can also provide a custom method
 * @param {Boolean?} [propagate=true]
 *      Should the messages propagate to parent loggers?
 * @constructor
 */
var LeoWinston = exports.LeoWinston = function(options){
    // Options: defaults
    this.options = _.defaults(options || {}, {
        levels: undefined,
        decorate: true,
        propagate: true
    });

    // Options: default decorator
    if (this.options.decorate)
        this.options.decorate = function(loggerName, message){
            if (message.length && message[0] !== '[')
                message = '[' + loggerName + '] ' + message;
            return message;
        };

    /** Winston container
     * @type {Container}
     */
    this.container = new winston.Container();

    /** Propagation chains hash
     * @type {Object.<String, Array>}
     */
    this._propagationChains = {};
};

/** Using all known loggers, rebuild the propagation chains
 * @protected
 */
LeoWinston.prototype._rebuildPropagationChains = function(){
    var self = this;

    this._propagationChains = _.compose(_.object, _.map)(
        _.omit(this.container.loggers, 'root'), // root logger is the topmost
        function(logger, loggerName){
            // Prepare the propagation chain for each logger
            var chain = _(self.container.loggers)
                .keys() // available loggers
                .without(loggerName, 'root') // exclude self and root
                .filter(function(name){ // exclude loggers with different prefix
                    return loggerName.indexOf(name+'.') === 0;
                })
                .sort(function(a, b){ // from parent to child
                    return b.length - a.length;
                })
                .value();
            chain.push('root'); // always last

            // Break the chain on non-propagate loggers
            var proceed = true;
            chain = _.head(chain, function(name){
                if (proceed){
                    proceed = self.get(name)._leo.options.propagate;
                    return true;
                }
                return proceed;
            });

            // Finish
            return [
                loggerName,
                chain
            ];
        }
    );
};

/** Add a logger
 * @param {String} name
 *      Logger name
 * @param {Object?} options
 *      Logger options
 * @param {Boolean} [options.propagate=true]
 *      Does this logger allow message propagation?
 * @param {Object.<String, Object>} options.transports
 *      Winston transports set on the logger: { transport name : configuration }.
 *      See Winston documentation for the details.
 *
 * @returns {Logger}
 */
LeoWinston.prototype.add = function(name, options){
    var self = this;

    // options: defaults
    options = _.defaults(options || {}, {
        propagate: true,
        transports: {}
    });

    // options.propagate
    if (this.options.propagate){
        // By default, winston adds a console logger. If it was not set explicitly - suppress the output
        if (options.transports.console === undefined)
            options.transports.console = { silent: true };
    }

    // Create logger
    var logger = this.container.add(name, options.transports);

    // Store some custom info in the logger
    logger._leo = {
        name: name,
        options: _.omit(options, 'transports')
    };

    // options.levels
    if (this.options.levels)
        logger.setLevels(this.options.levels);

    // options.decorate
    if (this.options.decorate)
        logger.log = _.wrap(
            logger.log,
            function(log, level, msg, meta){
                var args = _.toArray(arguments).slice(1);
                args[1] = self.options.decorate(name, args[1]); // decorate the message
                log.apply(this, args); // pass the decorated message further
            }
        );

    // options.propagate
    if (this.options.propagate){
        this._rebuildPropagationChains();

        // Propagate messages up
        if (options.propagate)
            logger.on('logged', function(level, msg, meta){
                var chain = self._propagationChains[name],
                    parent = chain && chain[0] && self.get(chain[0]);
                if (parent){
                    parent.log.apply(parent, arguments);
                }
            });
    }

    return logger;
};

/** Get a logger with the specified name
 * @param {String} [name='root']
 *      The logger to get.
 *      When the logger was not set up - a new one is created.
 * @returns {Logger}
 */
LeoWinston.prototype.get = function(name){
    // Undefined logger
    if (!this.container.has(name)){
        // no root container?
        if (!this.container.has('root'))
            throw new Error('Root logger is not initialized');

        // unknown logger requested
        return this.add(name, {});
    }

    // Get the logger
    return this.container.get(name);
};
