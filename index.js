    /*******************************************************************************
 *  Code contributed to the webinos project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2012 - 2013 Samsung Electronics (UK) Ltd
 * Author: Habib Virji (habib.virji@samsung.com)
 *******************************************************************************/

var Sync = function () {
    "use strict";
    var SyncObject = this;
    /**
     * Get object hash of all elements we want to synchronize
     */
    this.getObjectHash = function (jsonObject) {
        var myKey, diff = {};
        for (myKey in jsonObject) {
            if (jsonObject.hasOwnProperty (myKey)) { // purposefully ignoring child elts
                diff[myKey] = require("crypto").createHash ("md5").update (JSON.stringify (jsonObject[myKey])).digest ("hex");
            }
        }
        return diff;
    };

    /**
     * Compare hash of the elements.
     */
    this.compareObjectHash = function (jsonObject, remoteJsonObject) {
        var diff = [], ownJsonObject;
        if(jsonObject) {
            var contentsPzp = {};
            ownJsonObject = SyncObject.getObjectHash(jsonObject);
            // find Object this PZP has that PZH does not have...
            Object.keys(ownJsonObject).forEach(function(key) {
                if (!remoteJsonObject[key] && key){ // Object is not present at the PZH
                    contentsPzp[key] = jsonObject[key];
                }
            });
        }
        if (remoteJsonObject) {
            Object.keys(remoteJsonObject).forEach(function(key) {
                // Object exists but hash differs
                // Object does not exist, ask remote entity to send updated object
                if (key && ownJsonObject[key] !== remoteJsonObject[key] || !ownJsonObject[key]){
                    diff.push(key);
                    contentsPzp[key] = jsonObject[key];
                }
            });
        }
        if (Object.keys(contentsPzp).length > 0) diff.push(contentsPzp);
        return diff;
    };

    this.sendObjectContents = function(jsonObject, receivedDiff) {
        var list= {};
        receivedDiff.forEach(function(name){
            if (typeof name === "string"){
                list[name] = jsonObject[name];
            } else if (typeof name === "object"){
                for (var key in name) {
                    if (name.hasOwnProperty(key)){
                        jsonObject[key] = name[key];
                    }
                }
            }
        });
        return list;
    };

     function contains(localArr, lname) {
         for (var i = 0 ; i < localArr.length; i = i + 1) {
            if (localArr[i] == lname) {return true; }
         }
         return false;
     }

    function findDiffApply(remoteJson, localJson) {
        var localDiff = {}, localArr= [];
        if (Object.prototype.toString.call(remoteJson) === "[object Array]" &&
            Object.prototype.toString.call(localJson) === "[object Array]") {
            remoteJson.forEach(function(rname, rindex){
                if (rname && rname.id) {
                    var found = false;
                    localJson.forEach(function(lname, index){
                       if (rname == lname) {
                           if(!contains(localArr, rname)) localArr.push(rname); // If
                           found = true;
                       }
                       if (index+1 === localJson.length && !found) {
                           if(!contains(localArr, rname)) localArr.push(rname); // If
                           if(!contains(localArr, lname)) localArr.push(lname);
                      }
                    });
                }
                if (rindex+1 === remoteJson.length) {
                    localJson.forEach(function(lname, lindex){
                       if(!contains(localArr, lname)) localArr.push(lname);
                       if(lindex+1 === localJson.length) {console.log("findDiffApply", localArr);return localArr;}
                    });
                }
            });
            if (remoteJson.length === 0) {
                localJson.forEach(function(lname, lindex){
                    if(!contains(localArr, lname)) localArr.push(lname);
                    if(lindex+1 === localJson.length) {console.log("findDiffApply", localArr);return localArr;}
                });
            }
        } else if (Object.prototype.toString.call(remoteJson) === "[object Object]") {
            for (var key in remoteJson) {
                if (remoteJson.hasOwnProperty(key) && localJson && localJson.hasOwnProperty(key)){
                    if(typeof remoteJson[key] === "string") {
                        localDiff[key] = (remoteJson[key] !== localJson[key]) ? remoteJson[key]: localJson[key];
                    } else if (typeof remoteJson[key] === "object") {
                        localDiff[key]=findDiffApply(remoteJson[key], localJson[key]);
                    }
                } else {
                   localDiff[key] = remoteJson[key];
                }
            }

            // Special case when local JSON has more elements than remote JSON
            if (localJson && typeof localJson === "object") {
                for (key in localJson) {
                    if (!remoteJson.hasOwnProperty(key)){ // ignore remoteJSON as above part should handle it
                        localDiff[key] = localJson[key]; // Copy back all items
                    }
                }
            }
        }
        return localDiff;
    }



    /**
     * Here remoteJsonObject is actual data contents.
     */
    this.applyObjectContents = function(localJson, remoteJsonObject) {
        if (typeof remoteJsonObject !== "object" && typeof localJson !== "object") {
            return; // remoteJsonObject is not of type of object, return empty
        }
        var remote = Object.keys(remoteJsonObject);
        var local = Object.keys(localJson);
        remote.forEach(function(key){
            if(local.indexOf(key) === -1) { // This is new element add element, locally it does not exist
                localJson[key] = remoteJsonObject[key];
            } else { // Existing at both PZH and PZP
                if(typeof remoteJsonObject[key] === "string" && typeof localJson[key] === "string" &&
                remoteJsonObject[key] !== localJson[key]) { // Element are string
                    localJson[key] = remoteJsonObject[key];
                } else if (typeof remoteJsonObject[key] === "object"){
                    localJson[key] = findDiffApply(remoteJsonObject[key], localJson[key]);
                }
            }
        });
    };
};
var ParseXML = function(xmlData, callback) {
    var xml2js = require('xml2js');
    var xmlParser = new xml2js.Parser(xml2js.defaults["0.2"]);
    xmlParser.parseString(xmlData, function(err, jsonData) {
        if(!err) {
            callback(jsonData);
        }
    });
};

exports.sync = Sync;
exports.parseXML = ParseXML;
