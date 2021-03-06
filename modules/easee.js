/**
 * Node.js module for access to easee EV charging cloud API.
 * Author: Max Lindqvist 2021
 */

const fs    = require('fs');
const fetch = require(__dirname + '/../node_modules/node-fetch');
const conf  = JSON.parse(fs.readFileSync(__dirname + '/../conf/config.json'));

var accessToken = null;

async function authenticate() {
  if (fs.existsSync(__dirname + '/../data/auth.json')) {
    var authData = JSON.parse(fs.readFileSync(__dirname + '/../data/auth.json'));

    let accessTokenExpires = new Date(authData.expires);

    if (authData.expires > Math.floor(Date.now() / 1000)) {
      accessToken = authData.accessToken;
    } else {
      //Refresh token
      console.log("Need to refresh easee Access token using Refresh token");
      var payLoad = {
        accessToken : authData.accessToken,
        refreshToken: authData.refreshToken
      };

      let response = await fetch(conf.apiHost + '/api/accounts/refresh_token', {
        method : "post",
        headers: {"Content-Type": "application/json"},
        body   : JSON.stringify(payLoad)
      });
      let result = await response.json();

      if (response.status == 200) {
        accessToken = result.accessToken;
        var data = {
          accessToken : result.accessToken,
          expiresIn   : result.expiresIn,
          expires     : (Math.floor(result.expiresIn) + Math.floor(Date.now() / 1000)),
          tokenType   : result.tokenType,
          refreshToken: result.refreshToken
        };

        fs.writeFileSync(__dirname + '/../data/auth.json', JSON.stringify(data, null, 4), (err) => {
          if (err) {
            throw err;
          }
        });
      } else {
        console.log("Could not easee refresh Auth Token!");
      }
    }
  } else {
    // Auth data file does not exist, create inital login
    console.log("Initiate first time login");
    var payLoad = {
      userName: conf.userName,
      password: conf.password
    };

    let response = await fetch(conf.apiHost + '/api/accounts/token', {
      method : "post",
      headers: {"Content-Type": "application/json"},
      body   : JSON.stringify(payLoad)
    });
    let result = await response.json();

    if (response.status == 200) {
      accessToken = result.accessToken;
      var data = {
        accessToken : result.accessToken,
        expiresIn   : result.expiresIn,
        expires     : (Math.floor(result.expiresIn) + Math.floor(Date.now() / 1000)),
        tokenType   : result.tokenType,
        refreshToken: result.refreshToken
      };

      fs.writeFileSync(__dirname + '/../data/auth.json', JSON.stringify(data, null, 4), (err) => {
        if (err) {
          throw err;
        }
      });
    }
  }
}


/**
 * Common POST JSON function.
 *
 * @param {string} url     URL to post to.
 * @param {Object} payLoad JS object to post.
 */
async function postJson(url, payLoad) {
  let auth     = await authenticate();
  let response = await fetch(url, {
    method : 'post',
    headers: {"Content-Type": "application/json",
              "Authorization": "Bearer " + accessToken
    },
    body   : JSON.stringify(payLoad)
  });
  let result = await response.text();

  // console.log(result);

  if (response.status == 200) {
    return result;
  } else {
    return false;
  }
}

/**
 * Common GET JSON function.
 *
 * @param {string} url     URL to post to.
 */
async function getJson(url) {
  let auth     = await authenticate();
  let response = await fetch(url, {
    method : "get",
    headers: { "Content-Type": "application/json",
               "Authorization": "Bearer " + accessToken
    }
  });
  let result = await response.json();

  if (response.status == 200) {
    return result;
  } else {
    return false;
  }
}

/**
 * Get an JSON array of chargers.
 */
async function getChargers() {
  let chargers = await getJson(conf.apiHost + '/api/chargers');
  if (chargers) {
    return chargers;
  } else {
    return false;
  }
}

/**
 * Get JSON data of specified charger ID.
 *
 * @param {string} chargerId Charger ID (Like: EHxxxxxx)
 */
async function getChargerState(chargerId) {
  let chargerState = await getJson(conf.apiHost + '/api/chargers/' + chargerId + '/state');
  if (chargerState) {
    return chargerState;
  } else {
    return false;
  }
}

/**
 * Get site Current limits
 *
 * @param {string} siteId    Site ID
 * @param {string} circuitId Circuit ID
 */
async function getSiteCurrentLimits(siteId, circuitId) {
  let currentLimits = await getJson(conf.apiHost + '/api/sites/' + siteId + '/circuits/' + circuitId + '/settings');
  if (currentLimits) {
    return currentLimits;
  } else {
    return false;
  }
}

/**
 * Set site Current limits
 *
 * @param {string} siteId       Site ID
 * @param {string} circuitId    Circuit ID
 * @param {int}    currentLimit Current limit (in A)
 */
async function setSiteCurrentLimits(siteId, circuitId, currentLimit) {
  const payLoad = {
    maxCircuitCurrentP1: currentLimit,
    maxCircuitCurrentP2: currentLimit,
    maxCircuitCurrentP3: currentLimit,
    offlineMaxCircuitCurrentP1: currentLimit,
    offlineMaxCircuitCurrentP2: currentLimit,
    offlineMaxCircuitCurrentP3: currentLimit
  };

  let currentLimits = await postJson(conf.apiHost + '/api/sites/' + siteId + '/circuits/' + circuitId + '/settings', payLoad);
  if (currentLimits) {
    return currentLimits;
  } else {
    return false;
  }
}

/**
 * Get JSON data of all charging sessions the current day.
 *
 * @param {string} chargerId Charger ID (Like: EHxxxxxx)
 */
async function getChargerDailyUsage(chargerId) {
  var from = new Date();
  from.setHours(0,0,0,0);

  var to = new Date();
  to.setHours(23,59,59,999);

  let usage = await getJson(conf.apiHost + '/api/sessions/charger/' + chargerId + '/sessions/' + from.toISOString() + '/' + to.toISOString());
  if (usage) {
    return usage;
  } else {
    return false;
  }
}

exports.getChargers          = getChargers;
exports.getChargerState      = getChargerState;
exports.getChargerDailyUsage = getChargerDailyUsage;
exports.getSiteCurrentLimits = getSiteCurrentLimits;
exports.setSiteCurrentLimits = setSiteCurrentLimits;
