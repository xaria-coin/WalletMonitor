/**
 * Cryptonite Node.JS Pool
 * https://github.com/dvandal/cryptonote-nodejs-pool
 *
 * Pool initialization script
 **/

// Load needed modules
var fs = require('fs');
var cluster = require('cluster');
var os = require('os');

// Load configuration
require('./lib/configReader.js');

// Load log system
require('./lib/logger.js');

// Initialize redis database client
var redis = require('redis');

var redisDB = (config.redis.db && config.redis.db > 0) ? config.redis.db : 0;
global.redisClient = redis.createClient(config.redis.port, config.redis.host, { db: redisDB, auth_pass: config.redis.auth });

// Load pool modules
if (cluster.isWorker){
    switch(process.env.workerType){
        case 'api':
            require('./lib/api.js');
            break;
    }
    return;
}

// Initialize log system
var logSystem = 'master';
require('./lib/exceptionWriter.js')(logSystem);

// Pool informations
log('info', logSystem, 'Starting Cryptonote Node.JS pool version %s', [version]);
 
// Run a single module ?
var singleModule = (function(){
    var validModules = ['pool', 'api', 'unlocker', 'payments', 'chartsDataCollector', 'telegramBot'];

    for (var i = 0; i < process.argv.length; i++){
        if (process.argv[i].indexOf('-module=') === 0){
            var moduleName = process.argv[i].split('=')[1];
            if (validModules.indexOf(moduleName) > -1)
                return moduleName;

            log('error', logSystem, 'Invalid module "%s", valid modules: %s', [moduleName, validModules.join(', ')]);
            process.exit();
        }
    }
})();

/**
 * Start modules
 **/
(function init(){
    checkRedisVersion(function(){
        if (singleModule){
            log('info', logSystem, 'Running in single module mode: %s', [singleModule]);

            switch(singleModule){
                case 'api':
                    spawnApi();
                    break;
                }
        }
        else{
            spawnApi();
        }
    });
})();

/**
 * Check redis database version
 **/
function checkRedisVersion(callback){
    redisClient.info(function(error, response){
        if (error){
            log('error', logSystem, 'Redis version check failed');
            return;
        }
        var parts = response.split('\r\n');
        var version;
        var versionString;
        for (var i = 0; i < parts.length; i++){
            if (parts[i].indexOf(':') !== -1){
                var valParts = parts[i].split(':');
                if (valParts[0] === 'redis_version'){
                    versionString = valParts[1];
                    version = parseFloat(versionString);
                    break;
                }
            }
        }
        if (!version){
            log('error', logSystem, 'Could not detect redis version - must be super old or broken');
            return;
        }
        else if (version < 2.6){
            log('error', logSystem, "You're using redis version %s the minimum required version is 2.6. Follow the damn usage instructions...", [versionString]);
            return;
        }
        callback();
    });
}


/**
 * Spawn API module
 **/
function spawnApi(){
    if (!config.api || !config.api.enabled) return;

    var worker = cluster.fork({
        workerType: 'api'
    });
    worker.on('exit', function(code, signal){
        log('error', logSystem, 'API died, spawning replacement...');
        setTimeout(function(){
            spawnApi();
        }, 2000);
    });
}
