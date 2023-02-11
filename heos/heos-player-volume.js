/**
 * 
 * The HeosPlayerVolumeNode.
 * 
 **/

const heos = require('heos-api')
const heosHelper = require('./heos-helper.js');

module.exports = function(RED) {

    /**
     * The HeosPlayerVolumeNode can submit player volume commands to the HEOS network.
     */
    function HeosPlayerVolumeNode(config) {

        RED.nodes.createNode(this, config);
        var node = this;

        heosHelper.onInitNode(node)

        node.device = RED.nodes.getNode(config.device);
        node.deviceAutodiscover = config.deviceAutodiscover;

        node.heosPlayerId = config.playerId;
        node.heosPlayerVolume = config.playerVolume;

        var heosConnection;

        node.on('input', function(msg, send, done) {

            heosHelper.onHeosConnecting(node)

            var playerId = node.heosPlayerId;
            var playerVolumeLevel = node.heosPlayerVolumeLevel;

            if(config.playerIdFromPayload && msg.payload.playerId) {
                playerId = msg.payload.playerId;
            }

            if(config.playerVolumeLevelFromPayload && msg.payload.playerVolumeLevel) {
                playerVolumeLevel = msg.payload.playerVolumeLevel;
            }

            const attributes = {
                "pid": playerId,
                "level": playerVolumeLevel
            }

            if(node.deviceAutodiscover == "autodiscover") {

                // Autodiscovering is used - connect via discoverAndConnect
                heos.discoverAndConnect().then(connection => {
                    
                    heosHelper.onHeosConnected(node)

                    heosConnection = connection

                    connection
                        .on({ commandGroup: "player", command: "set_volume"}, (message) => {

                            // For maximum backwards compatibility, check that send exists.
                            // If this node is installed in Node-RED 0.x, it will need to
                            // fallback to using `node.send`
                            send = send || function() { node.send.apply(node,arguments) }

                            send(message);

                            heosHelper.doCloseHeosConnection(node, heosConnection)

                            if (done) {
                                done();
                            }
                        })
                        .onClose(error => {
                            
                            heosHelper.onCloseHeosConnection(node, error)
                        })
                        .onError(error => {
                            
                            heosHelper.onErrorHeosConnection(node, error)
                        })
                        .write("player", "set_volume", attributes)
                })
                .catch(reason => {

                    heosHelper.onHeosDiscoveryAndConnectCatch(node) 
                })
            }
            else {

                // Autodiscovering is disabled - connect to specific device
                if(node.device.ip) {

                    let ipAddress = node.device.ip;

                    heos.connect(ipAddress).then(connection => {
                        
                        heosHelper.onHeosConnected(node, ipAddress)

                        heosConnection = connection

                        connection
                            .on({ commandGroup: "player", command: "set_volume"}, (message) => {

                                // For maximum backwards compatibility, check that send exists.
                                // If this node is installed in Node-RED 0.x, it will need to
                                // fallback to using `node.send`
                                send = send || function() { node.send.apply(node,arguments) }

                                send(message);

                                heosHelper.doCloseHeosConnection(node, heosConnection)

                                if (done) {
                                    done();
                                }
                            })
                            .onClose(error => {
                                
                                heosHelper.onCloseHeosConnection(node, error)
                            })
                            .onError(error => {
                                
                                heosHelper.onErrorHeosConnection(node, error)
                            })
                            .write("player", "set_volume", attributes)
                    })
                    .catch(reason => {

                        heosHelper.onHeosDiscoveryAndConnectCatch(node, ipAddress) 
                    })
                }
                else {

                    heosHelper.onNodeNoIpDefined(node)
                }
            }

        });

        this.on('close', function(done) {

            heosHelper.onCloseNode(node, heosConnection, done)
        });
    }

    RED.nodes.registerType("heos-player-volume", HeosPlayerVolumeNode);
}