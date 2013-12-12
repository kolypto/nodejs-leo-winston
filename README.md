Leo-Winston
===========

Hierarchical logger system for [winston](https://github.com/flatiron/winston)
with configurable data flows, inspired by
[Python logging facility](http://docs.python.org/2/library/logging.html).






Usage
=====

Container
---------

First, you instantiate the `LeoWinston` container object: the service object which allows you to access all loggers
you create with it.

```js
var LeoWinston = require('leo-winston').LeoWinston;

var leo = new LeoWinston({
    levels: { silly: 0, debug: 1, verbose: 2, info: 3, warn: 4, error: 5 },
    decorate: true,
    propagate: true
});
```

The following `LeoWinston` container options are available:

* `levels`: Log levels to use for all loggers.
    Default: uses [winston's npm levels](https://github.com/flatiron/winston/blob/master/lib/winston/config/npm-config.js);
* `decorate: Boolean`: Whether to decorate each message with the logger name. Default: true
* `propagate: Boolean`: Use log messages propagation?

    When propagation is enabled, messages bubble up to parent loggers

    When a message is logged with the 'a.b.c.d' logger, it will propagate to loggers 'a.b.c', 'a.b', 'a', and finally, 'root'.



Define loggers
--------------

You define loggers with the following method:

`LeoWinston.add(name, options):Logger`

* `name: String`: The name of the logger to add.

    In order to use propagation, use '.'-notation to qualify logger names.

* `options: Object?`: Logger options object:

    * `propagate: Boolean`: Whether messages from this logger propagate further. Default: `true`

        When a logger is created with `propagate: false`, it will consume the messages without passing them on.

    * `transports: Object`: Winston transports configuration. See: [Working with transports](https://github.com/flatiron/winston#working-with-transports).

It's required that you have a single logger named `'root'`: this topmost logger catches messages from all registered
loggers (unless they explicitly define `propagation: false`).

```js
leo.add('root', {
    transports: {
        console: { level: 'silly', silent: false, colorize: true, timestamp: true }
    }
});

leo.add('http', { // will pass the messages on to 'root'
    transports: {
        file: { // log HTTP requests to a file
            level: 'silly', silent: false, colorize: false, timestamp: true,
            filename: '/tmp/tmp/root.log', json: false
        }
    }
});

leo.add('http.users', {}); // no logging, just propagate for now

leo.add('http.requests', {
    propagate: false, // don't propagate
    transports: { // log to console
        console: { level: 'silly', silent: false, colorize: true }
    }
});
```

It's wise to keep logger options in a config file: this way you'll have flexible app configurations.



Logging
-------

After you've configured your loggers, use the following method to get a logger:

`LeoWinston.get(name):Logger`

If the logger was not defined, it's created as a no-op logger.
When propagation is enabled, its messages propagate to the 'root' logger.

Wielding a logger, use it like a [normal Winston logger](https://github.com/flatiron/winston#logging):

```js
var logger = leo.get('http.users');
logger.log('info', 'message'); // (level, message[, meta][, callback])

// Each log level gets a corresponding method
logger.silly('message');
logger.debug('message');
logger.verbose('message');
logger.info('message');
logger.warn('message');
logger.error('message');
```





Receipts
========

Handling Uncaught Exceptions
----------------------------

```js
// Assuming your 'root' logger is configured correctly
leo.add('error');

process.on('uncaughtException', function (err) {
    leo.get('error').error(err + "\n" + err.stack);
});
```
