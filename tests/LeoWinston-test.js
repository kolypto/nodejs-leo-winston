'use strict';

var LeoWinston = require('../').LeoWinston;

exports.testDecoratedPropagate = function(test){
    var leo = new LeoWinston(/* { decorate: true, propagate: true } */);

    // Throw an error when no root logger is defined
    test.throws(function(){
        leo.get('test');
    }, Error);

    // Add loggers
    leo.add('root', { transports: { memory: {} } });
    
    leo.add('a.b', { transports: { memory: {} } });
    leo.add('a.b.c.d', { transports: { memory: {} } });
    leo.add('a.b.c.d.e', { transports: { memory: {} } });
    
    leo.add('x', { transports: { memory: {} } });
    leo.add('x.y', { propagate: false, transports: { memory: {} } });
    leo.add('x.y.z', { transports: { memory: {} } });

    // Test propagation chain
    test.deepEqual(leo._propagationChains, {
        'a.b': ['root'],
        'a.b.c.d': ['a.b', 'root'],
        'a.b.c.d.e': ['a.b.c.d', 'a.b', 'root'],
        'x': ['root'],
        'x.y': [],
        'x.y.z': ['x.y']
    });

    // Test logging
    [
        'root',
        'a.b', 'a.b.c.d', 'a.b.c.d.e',
        'x', 'x.y', 'x.y.z'
    ].forEach(function(loggerName){
        leo.get(loggerName).info(loggerName);
    });

    // Test the results
    test.deepEqual(
        leo.get('root').transports.memory.writeOutput,
        [
            'info: [root] root',
            'info: [a.b] a.b', 'info: [a.b.c.d] a.b.c.d', 'info: [a.b.c.d.e] a.b.c.d.e',
            'info: [x] x'
        ]);
    test.deepEqual(
        leo.get('a.b').transports.memory.writeOutput,
        [
            'info: [a.b] a.b', 'info: [a.b.c.d] a.b.c.d', 'info: [a.b.c.d.e] a.b.c.d.e'
        ]);
    test.deepEqual(
        leo.get('a.b.c.d').transports.memory.writeOutput,
        [
            'info: [a.b.c.d] a.b.c.d', 'info: [a.b.c.d.e] a.b.c.d.e'
        ]);
    test.deepEqual(
        leo.get('a.b.c.d.e').transports.memory.writeOutput,
        [
            'info: [a.b.c.d.e] a.b.c.d.e'
        ]);
    test.deepEqual(
        leo.get('x').transports.memory.writeOutput,
        [
            'info: [x] x'
        ]);
    test.deepEqual(
        leo.get('x.y').transports.memory.writeOutput,
        [
            'info: [x.y] x.y', 'info: [x.y.z] x.y.z'
        ]);
    test.deepEqual(
        leo.get('x.y.z').transports.memory.writeOutput,
        [
            'info: [x.y.z] x.y.z'
        ]);

    test.done();
};
