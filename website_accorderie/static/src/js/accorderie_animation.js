// TODO add this when enable in option of user to show where user click
// Conflict with dblclick
// function clickEffectClick(e) {
//     let d = document.createElement("div");
//     d.className = "clickEffect";
//     d.style.top = e.clientY + "px";
//     d.style.left = e.clientX + "px";
//     document.body.appendChild(d);
//     d.addEventListener('animationend', function () {
//         d.parentElement.removeChild(d);
//     }.bind(this));
// }
//
// document.addEventListener('click', clickEffectClick);

// Meter class that generates a number correlated to audio volume.
// The meter class itself displays nothing, but it makes the
// instantaneous and time-decaying volumes available for inspection.
// It also reports on the fraction of samples that were at or near
// the top of the measurement range.
function SoundMeter(context) {
    this.context = context;
    this.instant = 0.0;
    this.slow = 0.0;
    this.clip = 0.0;
    this.script = context.createScriptProcessor(2048, 1, 1);
    let that = this;
    this.script.onaudioprocess = function (event) {
        let input = event.inputBuffer.getChannelData(0);
        let i;
        let sum = 0.0;
        let clipcount = 0;
        for (i = 0; i < input.length; ++i) {
            sum += input[i] * input[i];
            if (Math.abs(input[i]) > 0.99) {
                clipcount += 1;
            }
        }
        that.instant = Math.sqrt(sum / input.length);
        that.slow = 0.95 * that.slow + 0.05 * that.instant;
        that.clip = clipcount / input.length;
    };
}

SoundMeter.prototype.connectToSource = function (stream, callback) {
    console.log("SoundMeter connecting");
    try {
        this.mic = this.context.createMediaStreamSource(stream);
        this.mic.connect(this.script);
        // necessary to make sample run, but should not be.
        this.script.connect(this.context.destination);
        if (typeof callback !== "undefined") {
            callback(null);
        }
    } catch (e) {
        console.error(e);
        if (typeof callback !== "undefined") {
            callback(e);
        }
    }
};
SoundMeter.prototype.stop = function () {
    this.mic.disconnect();
    this.script.disconnect();
};

odoo.define('website.accorderie_recording', function (require) {
    "use strict";

    require('web.dom_ready');
    let ajax = require('web.ajax');
    let core = require('web.core');
    let session = require('web.session');
    let Widget = require('web.Widget');
    let QWeb = core.qweb;

    // Get existing module
    let app = angular.module('AccorderieApp');

    app.controller('AnimationController', ['$scope', '$location', function ($scope, $location) {
        // AnimationController to manage page notification (message and notification)
        $scope._ = _;
        $scope.error = "";

        $scope.animationRecord = {
            enable: false,
            animationName: "",
            stateAnimation: 0, // 0 stop, 1-* animation state chain
            canvasPresentation: document.querySelector('.canvasPresentationClass'),
            mouseLet: document.querySelector('.mouse'),
            lastXFakeMouse: 0,
            lastYFakeMouse: 0,
            lstAnimation: [],

            recordOn: false,
            constraints: {video: true, audio: true},
            micNumber: 0,
            soundMeter: null,
            localStream: null,
            mediaRecorder: undefined,
            downloadLink: document.querySelector("a#downloadLink"),
            chunks: [],
        }

        $scope.selectWindowsRecording = function () {
            // Source https://github.com/addpipe/getDisplayMedia-demo
            if (!navigator.mediaDevices.getDisplayMedia) {
                alert(
                    "navigator.mediaDevices.getDisplayMedia not supported on your browser, use the latest version of Chrome"
                );
            } else {
                if (window.MediaRecorder === undefined) {
                    alert(
                        "MediaRecorder not supported on your browser, use the latest version of Firefox or Chrome"
                    );
                } else {
                    navigator.mediaDevices.getDisplayMedia($scope.animationRecord.constraints).then(function (screenStream) {
                        //check for microphone
                        navigator.mediaDevices.enumerateDevices().then(function (devices) {
                            $scope.animationRecord.micNumber = 0;
                            devices.forEach(function (device) {
                                if (device.kind === "audioinput") {
                                    $scope.animationRecord.micNumber++;
                                }
                            });

                            if ($scope.animationRecord.micNumber === 0) {
                                $scope.getStreamSuccess(screenStream);
                            } else {
                                navigator.mediaDevices.getUserMedia({audio: true}).then(
                                    function (micStream) {
                                        let composedStream = new MediaStream();

                                        //added the video stream from the screen
                                        screenStream.getVideoTracks().forEach(function (videoTrack) {
                                            composedStream.addTrack(videoTrack);
                                        });

                                        //if system audio has been shared
                                        if (screenStream.getAudioTracks().length > 0) {
                                            //merge the system audio with the mic audio
                                            let context = new AudioContext();
                                            let audioDestination = context.createMediaStreamDestination();

                                            const systemSource = context.createMediaStreamSource(screenStream);
                                            const systemGain = context.createGain();
                                            systemGain.gain.value = 1.0;
                                            systemSource.connect(systemGain).connect(audioDestination);
                                            console.log("added system audio");

                                            if (micStream && micStream.getAudioTracks().length > 0) {
                                                const micSource = context.createMediaStreamSource(micStream);
                                                const micGain = context.createGain();
                                                micGain.gain.value = 1.0;
                                                micSource.connect(micGain).connect(audioDestination);
                                                console.log("added mic audio");
                                            }

                                            audioDestination.stream.getAudioTracks().forEach(function (audioTrack) {
                                                composedStream.addTrack(audioTrack);
                                            });
                                        } else {
                                            //add just the mic audio
                                            micStream.getAudioTracks().forEach(function (micTrack) {
                                                composedStream.addTrack(micTrack);
                                            });
                                        }

                                        $scope.getStreamSuccess(composedStream);

                                    })
                                    .catch(function (err) {
                                        console.error("navigator.getUserMedia error: " + err);
                                    });
                            }
                        })
                            .catch(function (err) {
                                console.error(err.name + ": " + err.message);
                            });
                    })
                        .catch(function (err) {
                            console.error("navigator.getDisplayMedia error: " + err);
                        });
                }
            }


        }

        $scope.getStreamSuccess = function (stream) {
            $scope.animationRecord.localStream = stream;
            $scope.animationRecord.localStream.getTracks().forEach(function (track) {
                if (track.kind === "audio") {
                    track.onended = function (event) {
                        console.error("audio track.onended Audio track.readyState=" + track.readyState + ", track.muted=" + track.muted);
                    };
                }
                if (track.kind === "video") {
                    track.onended = function (event) {
                        console.error("video track.onended Audio track.readyState=" + track.readyState + ", track.muted=" + track.muted);
                    };
                }
            });

            // videoElement.srcObject = $scope.animationRecord.localStream;
            // videoElement.play();
            // videoElement.muted = true;
            // recBtn.disabled = false;
            // shareBtn.disabled = true;

            try {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                window.audioContext = new AudioContext();
            } catch (e) {
                console.error("Web Audio API not supported.");
            }

            console.debug("Record is on!");
            $scope.animationRecord.recordOn = true;

            $scope.animationRecord.soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
            $scope.animationRecord.soundMeter.connectToSource($scope.animationRecord.localStream, function (e) {
                if (e) {
                    console.error(e);
                    return;
                }
            });
        }

        $scope.stopRecording = function () {
            console.debug("Stop recording and download link " + $scope.animationRecord.downloadLink.href);
            $scope.animationRecord.mediaRecorder.stop();
            // window.open($scope.animationRecord.downloadLink, '_blank').focus();
            // window.open($scope.animationRecord.downloadLink.href, '_blank');
            // $scope.animationRecord.downloadLink.click();
            // console.debug("try it mathben");
            let media_block_modal = document.getElementById("s_media_block_modal");
            if (!_.isUndefined(media_block_modal)) {
                console.debug("Clone link and open it!");
                // let newNode = $scope.animationRecord.downloadLink.cloneNode(true);
                // newNode.id = "downloadLinkClone";
                // media_block_modal.parentNode.insertBefore(newNode, media_block_modal.nextSibling);
                // media_block_modal.appendChild(newNode);
                media_block_modal.appendChild($scope.animationRecord.downloadLink);
            }
        }

        $scope.startRecording = function () {
            if ($scope.animationRecord.localStream == null) {
                alert("Could not get local stream from mic/camera");
            } else {
                // recBtn.disabled = true;
                // stopBtn.disabled = false;

                /* use the stream */
                console.log("Start recording...");
                if (typeof MediaRecorder.isTypeSupported == "function") {
                    let options;
                    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
                        options = {mimeType: "video/webm;codecs=vp9"};
                    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
                        options = {mimeType: "video/webm;codecs=h264"};
                    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
                        options = {mimeType: "video/webm;codecs=vp8"};
                    }
                    if (options !== undefined) {
                        console.log("Using " + options.mimeType);
                        $scope.animationRecord.mediaRecorder = new MediaRecorder($scope.animationRecord.localStream, options);
                    } else {
                        console.warn("Cannot find codec, using default codecs for browser");
                        $scope.animationRecord.mediaRecorder = new MediaRecorder($scope.animationRecord.localStream);
                    }
                } else {
                    console.warn("isTypeSupported is not supported, using default codecs for browser");
                    $scope.animationRecord.mediaRecorder = new MediaRecorder($scope.animationRecord.localStream);
                }

                $scope.animationRecord.mediaRecorder.ondataavailable = function (e) {
                    $scope.animationRecord.chunks.push(e.data);
                };

                $scope.animationRecord.mediaRecorder.onerror = function (e) {
                    console.error("mediaRecorder.onerror: " + e);
                };

                $scope.animationRecord.mediaRecorder.onstart = function () {
                    console.log("mediaRecorder.onstart, mediaRecorder.state = " + $scope.animationRecord.mediaRecorder.state);

                    $scope.animationRecord.localStream.getTracks().forEach(function (track) {
                        if (track.kind === "audio") {
                            console.log("onstart - Audio track.readyState=" + track.readyState + ", track.muted=" + track.muted);
                        }
                        if (track.kind === "video") {
                            console.log("onstart - Video track.readyState=" + track.readyState + ", track.muted=" + track.muted);
                        }
                    });
                };

                $scope.animationRecord.mediaRecorder.onstop = function () {
                    console.log("mediaRecorder.onstop, mediaRecorder.state = " + $scope.animationRecord.mediaRecorder.state);

                    let blob = new Blob($scope.animationRecord.chunks, {type: "video/webm"});
                    $scope.animationRecord.chunks = [];

                    let videoURL = window.URL.createObjectURL(blob);
                    console.debug("Create object URL blob");
                    console.debug(videoURL);
                    $scope.animationRecord.downloadLink.href = videoURL;
                    // videoElement.src = videoURL;
                    $scope.animationRecord.downloadLink.innerHTML = "Download video file";

                    let rand = Math.floor(Math.random() * 10000000);
                    let name = "video_" + rand + ".webm";

                    $scope.animationRecord.downloadLink.setAttribute("download", name);
                    $scope.animationRecord.downloadLink.setAttribute("name", name);
                };

                $scope.animationRecord.mediaRecorder.onwarning = function (e) {
                    console.warn("mediaRecorder.onwarning: " + e);
                };

                $scope.animationRecord.mediaRecorder.start(10);

                $scope.animationRecord.localStream.getTracks().forEach(function (track) {
                    console.log(track.kind + ":" + JSON.stringify(track.getSettings()));
                    console.log(track.getSettings());
                });
            }
        }

        // $scope.mouse_x = 0;
        // $scope.mouse_y = 0;
        $scope.updateMoveMouse = function (event) {
            // Stop animation when move mouse
            // $scope.mouse_x = event.clientX;
            // $scope.mouse_y = event.clientY;
            // console.debug("Move mouse x: " + $scope.mouse_x + " y: " + $scope.mouse_y);
            if ($scope.animationRecord.enable && $scope.animationRecord.stateAnimation !== 0) {
                console.debug("Disable animation");
                $scope.animationRecord.stateAnimation = 0;
            }
        }

        $scope.stopAnimation = function () {
            $scope.animationRecord.stateAnimation = 0;
        }


        $scope._stopAnimation = function (timer) {
            if (!$scope.animationRecord.stateAnimation) {
                console.debug("call _stopAnimation");
                // Stop animation
                clearInterval(timer);
                // let body = document.querySelector('body');
                // if (body !== undefined) {
                //     body.style.cursor = 'default';
                // }
                // $scope.animationRecord.mouseLet.style.transform = `translate(${0}px, ${0}px)`;
                return true;
            }
            return false;
        }

        $scope.easeInOutQuart = function (t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
            return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
        }

        $scope.changeStateAnimation = function (index) {
            $scope.animationRecord.stateAnimation = index;
            try {
                $scope.$apply();
            } catch (e) {
                // ignore it
            }
        }

        $scope.animationClickEffect = function (x, y) {
            console.debug("click effect x " + x + " y " + y);
            let d = document.createElement("div");
            d.className = "clickEffect";
            d.style.top = y + "px";
            d.style.left = x + "px";
            document.body.appendChild(d);
            d.addEventListener('animationend', function () {
                d.parentElement.removeChild(d);
            }.bind(this));
        }

        $scope.animationSelectorToSelector = function (name, selector_from, selector_to, duration = 1000, nextAnimationIndex = 0, click_from = false, click_to = false, focus_to = false) {
            // when selector_from or selector_to is undefined, get last position of fake mouse
            console.debug("Start " + name);
            let fromX = 0;
            let fromY = 0;
            let fromLet = undefined;

            let toX = 0;
            let toY = 0;
            let toLet = undefined;

            let find_value = false;

            let start = new Date().getTime();
            let timer = setInterval(function () {
                if ($scope._stopAnimation(timer)) {
                    return;
                }
                // Search in timer and not before, wait after refresh UI
                if (!find_value) {
                    find_value = true;
                    if (_.isUndefined(selector_from)) {
                        fromX = $scope.animationRecord.lastXFakeMouse;
                        fromY = $scope.animationRecord.lastYFakeMouse;
                    } else {
                        fromLet = document.querySelector(selector_from);
                        if (!_.isUndefined(fromLet) && fromLet !== null) {
                            // TODO sometime, getBoundingClientRect return undefined, but offset work!
                            fromX = fromLet.offsetLeft + fromLet.offsetWidth / 2;
                            fromY = fromLet.offsetTop + fromLet.offsetHeight / 2;
                        } else {
                            clearInterval(timer);
                            $scope.animationRecord.stateAnimation = 0;
                            console.warn("Stop " + name + ", cannot find selector '" + selector_from + "'");
                            return;
                        }
                        if (click_from) {
                            fromLet.click();
                            $scope.animationClickEffect(fromX, fromY);
                        }
                    }
                    if (_.isUndefined(selector_to)) {
                        find_value = true;
                        toX = $scope.animationRecord.lastXFakeMouse;
                        toY = $scope.animationRecord.lastYFakeMouse;
                    } else if (find_value) {
                        toLet = document.querySelector(selector_to);

                        if (!_.isUndefined(toLet) && toLet !== null) {
                            // force scroll and re-update
                            // window.scrollTo(toX, toY);
                            // toLet = document.querySelector(selector_to);

                            let goatRect = toLet.getBoundingClientRect();
                            toX = goatRect.left + goatRect.width / 2;
                            toY = goatRect.top + goatRect.height / 2;
                        } else {
                            clearInterval(timer);
                            $scope.animationRecord.stateAnimation = 0;
                            console.warn("Stop " + name + ", cannot find selector '" + selector_to + "'");
                            return;
                        }
                    }
                    console.debug(name + " - Fake mouse x " + fromX + " y " + fromY + " goto x " + toX + " y " + toY);
                }

                let time = new Date().getTime() - start;
                let x = $scope.easeInOutQuart(time, fromX, toX - fromX, duration);
                let y = $scope.easeInOutQuart(time, fromY, toY - fromY, duration);
                // mouseLet.setAttribute('x', x);
                // mouseLet.setAttribute('y', 500);
                $scope.animationRecord.mouseLet.style.transform = `translate(${x}px, ${y}px)`;
                $scope.animationRecord.lastXFakeMouse = x;
                $scope.animationRecord.lastYFakeMouse = y;
                if (time >= duration) {
                    console.debug("End " + name);
                    $scope.changeStateAnimation(nextAnimationIndex);
                    clearInterval(timer);
                    if (!_.isUndefined(toLet)) {
                        if (click_to) {
                            toLet.click();
                            $scope.animationClickEffect(x, y);
                        }
                        if (focus_to) {
                            toLet.focus();
                            $scope.animationClickEffect(x, y);
                        }
                    }
                }
            }, 1000 / 60);
        }

        $scope.animationShowPresentation = function (name, title, duration = 1000, nextAnimationIndex = 0) {
            console.debug("Start " + name);

            function wrapText(context, text, x, y, maxWidth, lineHeight) {
                let words = text.split(' ');
                let line = '';

                for (let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    let metrics = context.measureText(testLine);
                    let testWidth = metrics.width;
                    if (testWidth > maxWidth && n > 0) {
                        context.fillText(line, x, y);
                        line = words[n] + ' ';
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                context.fillText(line, x, y);
            }

            // Force hide menu
            let menu = document.querySelector("#top_menu_collapse");
            if (!_.isUndefined(menu) && menu !== null) {
                menu.classList.remove("show");
            }

            // hide header and footer
            let lstHeader = document.querySelectorAll("nav");
            lstHeader.forEach(function (el) {
                el.style.display = "none";
            })
            let lstFooter = document.querySelectorAll("footer");
            lstFooter.forEach(function (el) {
                el.style.display = "none";
            })

            // Hide fake mouse
            $scope.animationRecord.mouseLet.style.zIndex = "";

            // Update size canvas
            let canvasW = document.body.clientWidth;
            let canvasH = document.body.clientHeight;
            let canvas = $scope.animationRecord.canvasPresentation;
            // let dpr = window.devicePixelRatio || 1;
            canvas.width = canvasW;
            canvas.height = canvasH;

            let ctx = canvas.getContext("2d");
            if (!_.isUndefined(ctx)) {
                ctx.beginPath();
                ctx.rect(0, 0, canvasW, canvasH);
                ctx.fillStyle = "white";
                ctx.fill();
                ctx.fillStyle = "black";
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                let textString = title;
                ctx.font = "30px Arial";
                let x = canvasW / 2;
                let y = canvasH / 2;
                // ctx.fillText(textString, x, y);
                // let newCanvasW = canvasW / dpr ? dpr > 1 : canvasW;
                wrapText(ctx, textString, x, y, canvasW, 25);
                // let textWidth = ctx.measureText(textString);
                // ctx.fillText(textString, (canvasW / 2) - (textWidth / 2), canvasH / 2);
            } else {
                console.error("Missing canvas context 2D");
            }

            let start = new Date().getTime();
            let timer = setInterval(function () {
                if ($scope._stopAnimation(timer)) {
                    return;
                }
                let time = new Date().getTime() - start;
                if (time >= duration) {
                    console.debug("End " + name);
                    $scope.changeStateAnimation(nextAnimationIndex);
                    clearInterval(timer);
                    let lstHeader = document.querySelectorAll("nav");
                    lstHeader.forEach(function (el) {
                        el.style.display = "";
                    })
                    let lstFooter = document.querySelectorAll("footer");
                    lstFooter.forEach(function (el) {
                        el.style.display = "";
                    })
                    // Erase all
                    ctx.clearRect(0, 0, canvasW, canvasH)
                }
            }, 1000 / 60);
        }

        $scope.animationTypingInput = function (name, ctrlScope, obj, key, text, duration = 1000, nextAnimationIndex = 0) {
            console.debug("Start " + name);
            let start = new Date().getTime();
            let speedTypingMS = 1000 / (80 * 10 / 60); // 80 mots minutes, mot = 10 caractères, to MS
            let indexTyping = 0;
            obj[key] = "";
            let timer = setInterval(function () {
                if ($scope._stopAnimation(timer)) {
                    return;
                }
                let time = new Date().getTime() - start;
                let nbChar = Math.floor((time - (indexTyping * speedTypingMS)) / speedTypingMS);
                if (nbChar > 0) {
                    let newChar = text.substr(indexTyping, nbChar);
                    // console.debug(speedTypingMS);
                    // console.debug(time);
                    // console.debug(newChar);
                    obj[key] += newChar;
                    indexTyping += nbChar;
                    ctrlScope.$apply();
                }
                if (time >= duration || indexTyping >= text.length) {
                    console.debug("End " + name);
                    if (indexTyping < text.length) {
                        // Detect if was finish to typing
                        let finalWord = text.substring(indexTyping);
                        obj[key] += finalWord;
                    }
                    $scope.changeStateAnimation(nextAnimationIndex);
                    clearInterval(timer);
                }
            }, 1000 / 60);
        }

        $scope.$watch('animationRecord.stateAnimation', function (newValue, oldValue) {
            console.debug("Debug stateAnimation new value: " + newValue + " - old value: " + oldValue);
            let presentation_timer_ms = 3000;
            let presentation_ending_timer_ms = 50000;
            let generic_timer_ms = 2500;
            let typing_timer_ms = 30000;
            // let body = document.querySelector('body');
            //         let $scope_controller = angular.element($("#wrap")).scope();
            //         $scope_controller.next_btn();
            // $scope.$apply();
            //         $scope.$digest();
            if (newValue > 0) {
                document.body.style.cursor = 'none';
                $scope.animationRecord.mouseLet.style.zIndex = 999;
            } else {
                $scope.animationRecord.mouseLet.style.zIndex = "";
                // Revert animation
                document.body.style.cursor = 'default';
                // Hide fake mouse
                $scope.animationRecord.mouseLet.style.transform = `translate(${0}px, ${0}px)`;
                // Clear canvas presentation
                let ctx = $scope.animationRecord.canvasPresentation.getContext("2d");
                ctx.clearRect(0, 0, $scope.animationRecord.canvasPresentation.width, $scope.animationRecord.canvasPresentation.height)
                $scope.animationRecord.canvasPresentation.width = 0;
                $scope.animationRecord.canvasPresentation.height = 0;
                // Revert menu/footer
                let lstHeader = document.querySelectorAll("nav");
                lstHeader.forEach(function (el) {
                    el.style.display = "";
                })
                let lstFooter = document.querySelectorAll("footer");
                lstFooter.forEach(function (el) {
                    el.style.display = "";
                })
                if ($scope.animationRecord.recordOn) {
                    setTimeout(function () {
                        $scope.stopRecording()
                    }, 2000);
                }
                return;
            }
            let name = $scope.animationRecord.animationName + " - " + newValue;

            if (newValue === 1 && oldValue === 0 && $scope.animationRecord.recordOn) {
                // start recording
                $scope.startRecording();
            }

            if ($scope.animationRecord.animationName === "Créer une offre de service publique individuelle") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Publier une offre de service individuelle", presentation_timer_ms, newValue + 2)
                    // } else if (newValue === 2) {
                    //     // select init.pos and click on suivant
                    //     setTimeout(function () {
                    //         $scope.animationSelectorToSelector(name, '[for="init.pos"]', '#nextBtn', generic_timer_ms, newValue + 3, true, true, false)
                    //     }, 500);
                } else if (newValue === 3) {
                    // click on individuelle
                    // $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.pos.single"]', generic_timer_ms, newValue + 1, false, true, false)
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.pos.single"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 500);
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.pos.single"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on Transport
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 6) {
                    // click on Transport local de personnes
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // click on Transport pour les courses
                    $scope.animationSelectorToSelector(name, undefined, '[for="122"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 8) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[for="122"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 9) {
                    // focus form.titre
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.titre"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 10) {
                    // typing form.titre
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "titre", "Covoiturage pour votre épicerie ♥", typing_timer_ms, newValue + 1)
                } else if (newValue === 11) {
                    // focus form.description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.description"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 12) {
                    // typing form.description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "description", "J'ai une grande voiture ✯, un gros coffre ✬ et j'adore jaser avec de nouvelles personnes 💫, je suis surement le bon candidat 🌟 pour vous aider dans la région de Laval 🌃 pour votre épicerie 🤩!", typing_timer_ms, newValue + 1)
                } else if (newValue === 13) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, '[ng-model="form.description"]', '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Créer une demande de service publique individuelle") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Publier une demande de service individuelle", presentation_timer_ms, newValue + 2)
                    // } else if (newValue === 2) {
                    //     // select init.pds and click on suivant
                    //     setTimeout(function () {
                    //         $scope.animationSelectorToSelector(name, '[for="init.pds"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    //     }, 500);
                } else if (newValue === 3) {
                    // click on individuelle
                    // $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.pds.single"]', generic_timer_ms, newValue + 1, false, true, false)
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.pds.single"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 500);
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.pds.single"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on Transport
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 6) {
                    // click on Transport local de personnes
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // click on Transport pour les courses
                    $scope.animationSelectorToSelector(name, undefined, '[for="122"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 8) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[for="122"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 9) {
                    // focus form.titre
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.titre"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 10) {
                    // typing form.titre
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "titre", "Besoin de covoiturage 🚗 pour chercher mon épicerie 🍔 achat local Québécois ⚜", typing_timer_ms, newValue + 1)
                } else if (newValue === 11) {
                    // focus form.description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.description"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 12) {
                    // typing form.description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "description", "J'ai besoin habituellement de transporter 4 sacs 🛍. \nAppelez moi à mon numéro ☎ 5 minutes avant d'arriver svp. \nPeace ☮", typing_timer_ms, newValue + 1)
                } else if (newValue === 13) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, '[ng-model="form.description"]', '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Créer un échange en tant que personne offrant le service avec une offre existante") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Créer un échange en tant que personne offrant le service avec une offre existante", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.saa"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.saa.offrir"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.saa.offrir"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on first item
                    setTimeout(function () {
                        let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                        let data = $scope_participer.state.data;
                        console.debug(data);
                        if ($scope_participer.state.data.length) {
                            let strOptionName = `option_${$scope_participer.state.data[0].id}`;
                            $scope.animationSelectorToSelector(name, undefined, `[name="${strOptionName}"]`, generic_timer_ms, newValue + 1, false, true, false)
                        } else {
                            // Show presentation of ending
                            $scope.animationShowPresentation(name, "Il manque de choix.", presentation_ending_timer_ms, 0)
                        }
                    }, 250);
                } else if (newValue === 6) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // focus chooseMember
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[id="chooseMember"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 8) {
                    // typing chooseMember
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.tmpForm, "modelChooseMember", "Martin", typing_timer_ms, newValue + 1)
                } else if (newValue === 9) {
                    // re-focus input chooseMember to show list
                    let chooseMemberInput = document.querySelector("[id=\"chooseMember\"]");
                    if (!_.isUndefined(chooseMemberInput) && chooseMemberInput !== null) {
                        chooseMemberInput.blur();
                        chooseMemberInput.focus();
                    }
                    $scope.animationRecord.stateAnimation = newValue + 1;
                } else if (newValue === 10) {
                    // click on Martin Petit
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[id="autoComplete_result_0"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 11) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 12) {
                    // focus on Date de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.date_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 13) {
                    // typing date echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    // Delay 1 sec, need it for bootstrap-datetimepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "date_service", tomorrowDate, typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 14) {
                    // focus on Time de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 15) {
                    // typing time echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_service", "13:00", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 16) {
                    // focus on Durée de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_realisation_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 17) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_realisation_service", "1:15", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 18) {
                    // focus on Durée trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_dure_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 19) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_dure_trajet", "0:30", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 20) {
                    // focus on Frais trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 21) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_trajet", "5", typing_timer_ms, newValue + 1)
                } else if (newValue === 22) {
                    // focus on Frais matériel
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_materiel"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 23) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_materiel", "2", typing_timer_ms, newValue + 1)
                } else if (newValue === 24) {
                    // focus on Description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.commentaires"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 25) {
                    // typing Description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "commentaires", "N'oubliez pas d'amener votre calepin 📝 pour prendre des notes.\nPuis deux crayons 🖌 🖍 de couleurs différentes!\nPuis votre appareil photo 📱, on pourrait apercevoir de jolies fleurs 🌹.", typing_timer_ms, newValue + 1)
                } else if (newValue === 26) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Créer un échange en tant que personne offrant le service avec une offre qui doit être créée") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Créer un échange en tant que personne offrant le service avec une offre qui doit être créée", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.saa"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.saa.offrir"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.saa.offrir"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on first item
                    $scope.animationSelectorToSelector(name, undefined, '[name="option_init.saa.offrir.nouveau"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 6) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[name="option_init.saa.offrir.nouveau"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // focus chooseMember
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[id="chooseMember"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 8) {
                    // typing chooseMember
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.tmpForm, "modelChooseMember", "Martin", typing_timer_ms, newValue + 1)
                } else if (newValue === 9) {
                    // re-focus input chooseMember to show list
                    let chooseMemberInput = document.querySelector("[id=\"chooseMember\"]");
                    if (!_.isUndefined(chooseMemberInput) && chooseMemberInput !== null) {
                        chooseMemberInput.blur();
                        chooseMemberInput.focus();
                    }
                    $scope.animationRecord.stateAnimation = newValue + 1;
                } else if (newValue === 10) {
                    // click on Martin Petit
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[id="autoComplete_result_0"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 11) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 12) {
                    // click on Transport
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 13) {
                    // click on Transport local de personnes
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 14) {
                    // click on Transport pour les courses
                    $scope.animationSelectorToSelector(name, undefined, '[for="122"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 15) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[for="122"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 16) {
                    // focus form.titre
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.titre"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 17) {
                    // typing form.titre
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "titre", "Besoin de covoiturage 🚗 pour chercher mon épicerie 🍔 achat local Québécois ⚜", typing_timer_ms, newValue + 1)
                } else if (newValue === 18) {
                    // focus form.description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.description"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 19) {
                    // typing form.description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "description", "J'ai besoin habituellement de transporter 4 sacs 🛍. \nAppelez moi à mon numéro ☎ 5 minutes avant d'arriver svp. \nPeace ☮", typing_timer_ms, newValue + 1)
                } else if (newValue === 20) {
                    // focus on Date de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.date_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 21) {
                    // typing date echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    // Delay 1 sec, need it for bootstrap-datetimepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "date_service", tomorrowDate, typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 22) {
                    // focus on Time de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 23) {
                    // typing time echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_service", "13:00", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 24) {
                    // focus on Durée de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_service_estimated"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 25) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_service_estimated", "1:15", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 26) {
                    // focus on Durée trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_drive_estimated"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 27) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_drive_estimated", "0:30", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 28) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Créer un échange en tant que personne recevant le service d’une offre existante") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Créer un échange en tant que personne recevant le service d’une offre existante", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.saa"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.saa.recevoir"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.saa.recevoir"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // focus chooseMember
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[id="chooseMember"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 6) {
                    // typing chooseMember
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.tmpForm, "modelChooseMember", "Martin", typing_timer_ms, newValue + 1)
                } else if (newValue === 7) {
                    // re-focus input chooseMember to show list
                    let chooseMemberInput = document.querySelector("[id=\"chooseMember\"]");
                    if (!_.isUndefined(chooseMemberInput) && chooseMemberInput !== null) {
                        chooseMemberInput.blur();
                        chooseMemberInput.focus();
                    }
                    $scope.animationRecord.stateAnimation = newValue + 1;
                } else if (newValue === 8) {
                    // click on Martin Bergeron
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[id="autoComplete_result_1"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 9) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 10) {
                    // click on first item
                    setTimeout(function () {
                        let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                        let data = $scope_participer.state.data;
                        console.debug(data);
                        if ($scope_participer.state.data.length) {
                            let strOptionName = `option_${$scope_participer.state.data[0].id}`;
                            $scope.animationSelectorToSelector(name, undefined, `[name="${strOptionName}"]`, generic_timer_ms, newValue + 1, false, true, false)
                        } else {
                            // Show presentation of ending
                            $scope.animationShowPresentation(name, "Il manque de choix.", presentation_ending_timer_ms, 0)
                        }
                    }, 250);
                } else if (newValue === 11) {
                    // click on Suivant
                    // $scope.animationSelectorToSelector(name, '[name="option_1"]', '#nextBtn', generic_timer_ms, 12, false, true, false)
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 12) {
                    // Click on date
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, `[data-day="${tomorrowDate}"]`, generic_timer_ms, newValue + 1, false, false, true)
                    }, 250);
                } else if (newValue === 13) {
                    // Apply new date
                    // Remove class
                    let todayDate = moment().format("YYYY-MM-DD");
                    let todayDateDOM = document.querySelector(`[data-day="${todayDate}"]`);
                    todayDateDOM.classList.remove("active");
                    // Add class
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    let tomorrowDateDOM = document.querySelector(`[data-day="${tomorrowDate}"]`);
                    tomorrowDateDOM.classList.add("active");
                    // Change date
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $(`#${$scope_participer.state.model_field_name}`).data().date = tomorrowDate;
                    // $scope_participer.form["date_service"] = moment(data.date).format("YYYY-MM-DD");
                    // $scope_participer.form["time_service"] = moment(data.date).format("HH:mm");
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 14) {
                    // Click on time
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[data-time-component="hours"]', generic_timer_ms, newValue + 1, false, false, true)
                    }, 250);
                } else if (newValue === 15) {
                    // Change time
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $(`#${$scope_participer.state.model_field_name}`).data().date = "13:00";
                    // Show new time
                    let timeDOM = document.querySelector('[data-time-component="hours"]');
                    timeDOM.innerHTML = "13";
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 16) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Créer un échange en tant que personne recevant le service d’une demande qui doit être créée") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Créer un échange en tant que personne recevant le service d’une demande qui doit être créée", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.saa"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.saa.recevoir"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.saa.recevoir"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // focus chooseMember
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[id="chooseMember"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 6) {
                    // typing chooseMember
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.tmpForm, "modelChooseMember", "Martin", typing_timer_ms, newValue + 1)
                } else if (newValue === 7) {
                    // re-focus input chooseMember to show list
                    let chooseMemberInput = document.querySelector("[id=\"chooseMember\"]");
                    if (!_.isUndefined(chooseMemberInput) && chooseMemberInput !== null) {
                        chooseMemberInput.blur();
                        chooseMemberInput.focus();
                    }
                    $scope.animationRecord.stateAnimation = newValue + 1;
                } else if (newValue === 8) {
                    // click on Martin Bergeron
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[id="autoComplete_result_1"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 9) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 10) {
                    // click on first item
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[name="option_init.saa.recevoir.choix.nouveau"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 11) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[name="option_init.saa.recevoir.choix.nouveau"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 12) {
                    // click on Transport
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 13) {
                    // click on Transport local de personnes
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 14) {
                    // click on Transport pour les courses
                    $scope.animationSelectorToSelector(name, undefined, '[for="122"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 15) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[for="122"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 16) {
                    // focus form.titre
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.titre"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 17) {
                    // typing form.titre
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "titre", "Besoin de covoiturage 🚗 pour chercher mon épicerie 🍔 achat local Québécois ⚜", typing_timer_ms, newValue + 1)
                } else if (newValue === 18) {
                    // focus form.description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.description"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 19) {
                    // typing form.description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "description", "J'ai besoin habituellement de transporter 4 sacs 🛍. \nAppelez moi à mon numéro ☎ 5 minutes avant d'arriver svp. \nPeace ☮", typing_timer_ms, newValue + 1)
                } else if (newValue === 20) {
                    // focus on Date de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.date_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 21) {
                    // typing date echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    // Delay 1 sec, need it for bootstrap-datetimepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "date_service", tomorrowDate, typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 22) {
                    // focus on Time de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 23) {
                    // typing time echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_service", "13:00", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 24) {
                    // focus on Durée de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_realisation_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 25) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_realisation_service", "1:15", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 26) {
                    // focus on Durée trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_dure_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 27) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_dure_trajet", "0:30", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 28) {
                    // focus on Description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.commentaires"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 29) {
                    // typing Description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "commentaires", "N'oubliez pas d'amener votre calepin 📝 pour prendre des notes.", typing_timer_ms, newValue + 1)
                } else if (newValue === 30) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Valider un échange existant") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Valider un échange existant", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.va"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.oui"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.oui"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on first item
                    setTimeout(function () {
                        let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                        let data = $scope_participer.state.data;
                        console.debug(data);
                        if ($scope_participer.state.data.length) {
                            let strOptionName = `option_${$scope_participer.state.data[0].id}`;
                            $scope.animationSelectorToSelector(name, undefined, `[name="${strOptionName}"]`, generic_timer_ms, newValue + 1, false, true, false)
                        } else {
                            // Show presentation of ending
                            $scope.animationShowPresentation(name, "Il manque de choix.", presentation_ending_timer_ms, 0)
                        }
                    }, 250);
                } else if (newValue === 6) {
                    // click on Suivant
                    // $scope.animationSelectorToSelector(name, '[name="option_1"]', '#nextBtn', generic_timer_ms, 12, false, true, false)
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // focus on Durée de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_realisation_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 8) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_realisation_service", "1:15", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 9) {
                    // focus on Durée trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_dure_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 10) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_dure_trajet", "0:30", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 11) {
                    // focus on Frais trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 12) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_trajet", "5", typing_timer_ms, newValue + 1)
                } else if (newValue === 13) {
                    // focus on Frais matériel
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_materiel"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 14) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_materiel", "2", typing_timer_ms, newValue + 1)
                } else if (newValue === 15) {
                    // focus on Description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.commentaires"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 16) {
                    // typing Description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "commentaires", "Tout s'est bien passé!", typing_timer_ms, newValue + 1)
                } else if (newValue === 17) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Valider un échange inexistant lorsqu’on est la personne qui a offert le service sur une offre créée") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Valider un échange inexistant lorsqu’on est la personne qui a offert le service sur une offre créée", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.va"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.non"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.non"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.non.offert"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 6) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.non.offert"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // click on first item
                    setTimeout(function () {
                        let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                        let data = $scope_participer.state.data;
                        console.debug(data);
                        if ($scope_participer.state.data.length) {
                            let strOptionName = `option_${$scope_participer.state.data[0].id}`;
                            $scope.animationSelectorToSelector(name, undefined, `[name="${strOptionName}"]`, generic_timer_ms, newValue + 1, false, true, false)
                        } else {
                            // Show presentation of ending
                            $scope.animationShowPresentation(name, "Il manque de choix.", presentation_ending_timer_ms, 0)
                        }
                    }, 250);
                } else if (newValue === 8) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 9) {
                    // focus chooseMember
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[id="chooseMember"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 10) {
                    // typing chooseMember
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.tmpForm, "modelChooseMember", "Martin", typing_timer_ms, newValue + 1)
                } else if (newValue === 11) {
                    // re-focus input chooseMember to show list
                    let chooseMemberInput = document.querySelector("[id=\"chooseMember\"]");
                    if (!_.isUndefined(chooseMemberInput) && chooseMemberInput !== null) {
                        chooseMemberInput.blur();
                        chooseMemberInput.focus();
                    }
                    $scope.animationRecord.stateAnimation = newValue + 1;
                } else if (newValue === 12) {
                    // click on Martin Petit
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[id="autoComplete_result_0"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 13) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 14) {
                    // focus on Date de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.date_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 15) {
                    // typing date echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    // Delay 1 sec, need it for bootstrap-datetimepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "date_service", tomorrowDate, typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 16) {
                    // focus on Time de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 17) {
                    // typing time echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_service", "13:00", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 18) {
                    // focus on Durée de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_realisation_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 19) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_realisation_service", "1:15", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 20) {
                    // focus on Durée trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_dure_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 21) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_dure_trajet", "0:30", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 22) {
                    // focus on Frais trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 23) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_trajet", "5", typing_timer_ms, newValue + 1)
                } else if (newValue === 24) {
                    // focus on Frais matériel
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_materiel"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 25) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_materiel", "2", typing_timer_ms, newValue + 1)
                } else if (newValue === 26) {
                    // focus on Description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.commentaires"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 27) {
                    // typing Description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "commentaires", "N'oubliez pas d'amener votre calepin 📝 pour prendre des notes.", typing_timer_ms, newValue + 1)
                } else if (newValue === 28) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Valider un échange inexistant lorsqu’on est la personne qui a demandé le service sur une offre créée") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Valider un échange inexistant lorsqu’on est la personne qui a demandé le service sur une offre créée", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.va"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.non"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.non"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.non.recu"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 6) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.non.recu"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // focus chooseMember
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[id="chooseMember"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 8) {
                    // typing chooseMember
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.tmpForm, "modelChooseMember", "Martin", typing_timer_ms, newValue + 1)
                } else if (newValue === 9) {
                    // re-focus input chooseMember to show list
                    let chooseMemberInput = document.querySelector("[id=\"chooseMember\"]");
                    if (!_.isUndefined(chooseMemberInput) && chooseMemberInput !== null) {
                        chooseMemberInput.blur();
                        chooseMemberInput.focus();
                    }
                    $scope.animationRecord.stateAnimation = newValue + 1;
                } else if (newValue === 10) {
                    // click on Martin Bergeron
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[id="autoComplete_result_1"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 11) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 12) {
                    // click on first item
                    setTimeout(function () {
                        let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                        let data = $scope_participer.state.data;
                        console.debug(data);
                        if ($scope_participer.state.data.length) {
                            let strOptionName = `option_${$scope_participer.state.data[0].id}`;
                            $scope.animationSelectorToSelector(name, undefined, `[name="${strOptionName}"]`, generic_timer_ms, newValue + 1, false, true, false)
                        } else {
                            // Show presentation of ending
                            $scope.animationShowPresentation(name, "Il manque de choix.", presentation_ending_timer_ms, 0)
                        }
                    }, 250);
                } else if (newValue === 13) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 14) {
                    // focus on Date de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.date_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 15) {
                    // typing date echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    // Delay 1 sec, need it for bootstrap-datetimepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "date_service", tomorrowDate, typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 16) {
                    // focus on Time de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 17) {
                    // typing time echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_service", "13:00", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 18) {
                    // focus on Durée de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_realisation_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 19) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_realisation_service", "1:15", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 20) {
                    // focus on Durée trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_dure_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 21) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_dure_trajet", "0:30", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 22) {
                    // focus on Frais trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 23) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_trajet", "5", typing_timer_ms, newValue + 1)
                } else if (newValue === 24) {
                    // focus on Frais matériel
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_materiel"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 25) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_materiel", "2", typing_timer_ms, newValue + 1)
                } else if (newValue === 26) {
                    // focus on Description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.commentaires"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 27) {
                    // typing Description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "commentaires", "Tout s'est bien passé!", typing_timer_ms, newValue + 1)
                } else if (newValue === 28) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Valider un échange inexistant lorsqu’on est la personne qui a offert le service sur une offre qui doit être créée") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Valider un échange inexistant lorsqu’on est la personne qui a offert le service sur une offre qui doit être créée", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.va"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.non"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.non"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.non.offert"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 6) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.non.offert"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // click on first item
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[name="option_init.va.non.offert.nouveau"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 8) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[name="option_init.va.non.offert.nouveau"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 9) {
                    // focus chooseMember
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[id="chooseMember"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 10) {
                    // typing chooseMember
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.tmpForm, "modelChooseMember", "Martin", typing_timer_ms, newValue + 1)
                } else if (newValue === 11) {
                    // re-focus input chooseMember to show list
                    let chooseMemberInput = document.querySelector("[id=\"chooseMember\"]");
                    if (!_.isUndefined(chooseMemberInput) && chooseMemberInput !== null) {
                        chooseMemberInput.blur();
                        chooseMemberInput.focus();
                    }
                    $scope.animationRecord.stateAnimation = newValue + 1;
                } else if (newValue === 12) {
                    // click on Martin Petit
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[id="autoComplete_result_0"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 13) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 14) {
                    // click on Transport
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 15) {
                    // click on Transport local de personnes
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 16) {
                    // click on Transport pour les courses
                    $scope.animationSelectorToSelector(name, undefined, '[for="122"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 17) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[for="122"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 18) {
                    // focus form.titre
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.titre"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 19) {
                    // typing form.titre
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "titre", "Besoin de covoiturage 🚗 pour chercher mon épicerie 🍔 achat local Québécois ⚜", typing_timer_ms, newValue + 1)
                } else if (newValue === 20) {
                    // focus form.description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.description"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 21) {
                    // typing form.description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "description", "J'ai besoin habituellement de transporter 4 sacs 🛍. \nAppelez moi à mon numéro ☎ 5 minutes avant d'arriver svp. \nPeace ☮", typing_timer_ms, newValue + 1)
                } else if (newValue === 22) {
                    // focus on Date de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.date_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 23) {
                    // typing date echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    // Delay 1 sec, need it for bootstrap-datetimepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "date_service", tomorrowDate, typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 24) {
                    // focus on Time de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 25) {
                    // typing time echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_service", "13:00", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 26) {
                    // focus on Durée de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_realisation_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 27) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_realisation_service", "1:15", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 28) {
                    // focus on Durée trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_dure_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 29) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_dure_trajet", "0:30", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 30) {
                    // focus on Frais trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 31) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_trajet", "5", typing_timer_ms, newValue + 1)
                } else if (newValue === 32) {
                    // focus on Frais matériel
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_materiel"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 33) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_materiel", "2", typing_timer_ms, newValue + 1)
                } else if (newValue === 34) {
                    // focus on Description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.commentaires"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 35) {
                    // typing Description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "commentaires", "N'oubliez pas d'amener votre calepin 📝 pour prendre des notes.", typing_timer_ms, newValue + 1)
                } else if (newValue === 36) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            } else if ($scope.animationRecord.animationName === "Valider un échange inexistant lorsqu’on est la personne qui a demandé le service sur une demande qui doit être créée") {
                if (newValue === 1) {
                    // Detect URL and redirect to begin
                    if (window.location.pathname === "/participer") {
                        $location.url($location.path());
                    } else {
                        console.error($scope.animationRecord.animationName + " not support this location.")
                        $scope.stopAnimation();
                        return;
                    }
                    // Show presentation of animation
                    $scope.animationShowPresentation(name, "Valider un échange inexistant lorsqu’on est la personne qui a demandé le service sur une demande qui doit être créée", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.saa and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.va"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.non"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 4) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.non"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 5) {
                    // click on Offrir
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.va.non.recu"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 6) {
                    // click on suivant
                    $scope.animationSelectorToSelector(name, '[for="init.va.non.recu"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 7) {
                    // focus chooseMember
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[id="chooseMember"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 8) {
                    // typing chooseMember
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.tmpForm, "modelChooseMember", "Martin", typing_timer_ms, newValue + 1)
                } else if (newValue === 9) {
                    // re-focus input chooseMember to show list
                    let chooseMemberInput = document.querySelector("[id=\"chooseMember\"]");
                    if (!_.isUndefined(chooseMemberInput) && chooseMemberInput !== null) {
                        chooseMemberInput.blur();
                        chooseMemberInput.focus();
                    }
                    $scope.animationRecord.stateAnimation = newValue + 1;
                } else if (newValue === 10) {
                    // click on Martin Bergeron
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[id="autoComplete_result_1"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 11) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, undefined, '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 12) {
                    // click on first item
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, undefined, '[name="option_init.va.non.recu.choix.nouveau"]', generic_timer_ms, newValue + 1, false, true, false)
                    }, 250);
                } else if (newValue === 13) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[name="option_init.va.non.recu.choix.nouveau"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 14) {
                    // click on Transport
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 15) {
                    // click on Transport local de personnes
                    $scope.animationSelectorToSelector(name, undefined, '[for="5"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 16) {
                    // click on Transport pour les courses
                    $scope.animationSelectorToSelector(name, undefined, '[for="122"]', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 17) {
                    // click on Suivant
                    $scope.animationSelectorToSelector(name, '[for="122"]', '#nextBtn', generic_timer_ms, newValue + 1, false, true, false)
                } else if (newValue === 18) {
                    // focus form.titre
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.titre"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 19) {
                    // typing form.titre
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "titre", "Besoin de covoiturage 🚗 pour chercher mon épicerie 🍔 achat local Québécois ⚜", typing_timer_ms, newValue + 1)
                } else if (newValue === 20) {
                    // focus form.description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.description"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 21) {
                    // typing form.description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "description", "J'ai besoin habituellement de transporter 4 sacs 🛍. \nAppelez moi à mon numéro ☎ 5 minutes avant d'arriver svp. \nPeace ☮", typing_timer_ms, newValue + 1)
                } else if (newValue === 22) {
                    // focus on Date de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.date_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 23) {
                    // typing date echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    let tomorrowDate = moment().add(1, 'days').format("YYYY-MM-DD");
                    // Delay 1 sec, need it for bootstrap-datetimepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "date_service", tomorrowDate, typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 24) {
                    // focus on Time de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 25) {
                    // typing time echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_service", "13:00", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 26) {
                    // focus on Durée de l'échange
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_realisation_service"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 27) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_realisation_service", "1:15", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 28) {
                    // focus on Durée trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.time_dure_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 29) {
                    // typing Durée echange
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    // Delay 1 sec, need it for bootstrap-timepicker
                    setTimeout(function () {
                        $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "time_dure_trajet", "0:30", typing_timer_ms, newValue + 1)
                    }, 500);
                } else if (newValue === 30) {
                    // focus on Frais trajet
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_trajet"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 31) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_trajet", "5", typing_timer_ms, newValue + 1)
                } else if (newValue === 32) {
                    // focus on Frais matériel
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.frais_materiel"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 33) {
                    // typing Frais trajet
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "frais_materiel", "2", typing_timer_ms, newValue + 1)
                } else if (newValue === 34) {
                    // focus on Description
                    $scope.animationSelectorToSelector(name, undefined, '[ng-model="form.commentaires"]', generic_timer_ms, newValue + 1, false, false, true)
                } else if (newValue === 35) {
                    // typing Description
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="ParticiperController"]')).scope();
                    $scope.animationTypingInput(name, $scope_participer, $scope_participer.form, "commentaires", "Tout s'est bien passé!", typing_timer_ms, newValue + 1)
                } else if (newValue === 36) {
                    // click on Valider
                    $scope.animationSelectorToSelector(name, undefined, '#submitBtn', generic_timer_ms, 0, false, true, false)
                }
            }
            // Stop animation
            // $scope.animationRecord.stateAnimation = 0;
        });


    }])

    let AccorderieAnimation = Widget.extend({
        start: function () {
        },
    });

    return AccorderieAnimation;

});
