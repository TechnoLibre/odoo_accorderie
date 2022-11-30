odoo.define('website.accorderie_canada_ddb.participer.instance', function (require) {
    'use strict';

    require('web_editor.ready');
    let ParticiperForm = require('website.accorderie_canada_ddb.participer');

    let $form = $('#participer_form');
    if (_.isEmpty($form)) {
        return null;
    }

    let instance = new ParticiperForm();
    return instance.appendTo($form).then(function () {
        return instance;
    });
});

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

odoo.define("accorderie.website.date_and_time", function (require) {
    "use strict";

    require("web.dom_ready");
    let ajax = require("web.ajax");
    let base = require("web_editor.base");
    let context = require("web_editor.context");

    function load_locale() {
        let url = "/web/webclient/locale/" + context.get().lang || "en_US";
        return ajax.loadJS(url);
    }

    $.when(base.ready(), load_locale());
});

class DefaultDict {
    constructor(defaultInit) {
        return new Proxy({}, {
            get: (target, name) => name in target ?
                target[name] :
                (target[name] = typeof defaultInit === 'function' ?
                    new defaultInit().valueOf() :
                    defaultInit)
        })
    }
}

// function compileAngularElement(elSelector) {
//
//     var elSelector = (typeof elSelector == 'string') ? elSelector : null;
//     // The new element to be added
//     if (elSelector != null) {
//         var $div = $(elSelector);
//
//         // The parent of the new element
//         var $target = $("[ng-app]");
//
//         angular.element($target).injector().invoke(['$compile', function ($compile) {
//             var $scope = angular.element($target).scope();
//             $compile($div)($scope);
//             // Finally, refresh the watch expressions in the new element
//             $scope.$apply();
//         }]);
//     }
//
// }

//==============================================================================

odoo.define("website.accorderie_canada_ddb.participer", function (require) {
    'use strict';

    // For compile angularjs
    // let sAnimation = require('website.content.snippets.animation');
    // require('website.content.menu');

    let ajax = require('web.ajax');
    let core = require('web.core');
    let session = require('web.session');
    let Widget = require('web.Widget');
    let _t = core._t;

    const INIT_STATE = "init";
    const PARAM_STATE_NAME = "state";

    if (window.location.pathname === "/web/signup") {
        console.info("Disable AngularJS, this block signup form.")
        document.getElementById("wrapwrap").removeAttribute("ng-app");
        document.getElementById("wrapwrap").removeAttribute("ng-controller");
    }

    let app = angular.module('AccorderieApp', []);
    app.filter('unsafe', function ($sce) {
        // This allows html generation in view
        return $sce.trustAsHtml;
    });
    app.filter('lengthKeys', function () {
        return function ($sce) {
            return Object.keys($sce).length;
        }
    });
    app.filter('toTitleCase', function () {
        return function ($sce) {
            return $sce.replace(
                /\w\S*/g,
                function (txt) {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                }
            );
        }
    });

    // sAnimation.registry.affixMenu.include({
    //     /**
    //      * @override
    //      */
    //     start: function () {
    //         var def = this._super.apply(this, arguments);
    //         return def;
    //     },
    //
    //     //--------------------------------------------------------------------------
    //     // Handlers
    //     //--------------------------------------------------------------------------
    //
    //     /**
    //      * @override
    //      */
    //     _onWindowUpdate: function () {
    //         this._super.apply(this, arguments);
    //         if (this.$headerClone) {
    //             // this.$headerClone.each(function () {
    //             // this.$headers.each(function () {
    //             //     let content = $(this);
    //             var content = this.$headerClone;
    //
    //             var content = $("#patate");
    //             var $target = $("[ng-app]");
    //
    //             angular.element($target).injector().invoke(['$compile', function ($compile) {
    //                 var $scope = angular.element($target).scope();
    //
    //                 // $scope.personal.actual_bank_hours += 1;
    //                 // $scope.update_personal_data();
    //
    //                 // let test = $("{{personal.actual_bank_hours}}")
    //                 // $compile(test)($scope);
    //
    //                 $compile(content)($scope);
    //                 // Finally, refresh the watch expressions in the new element
    //                 $scope.$apply();
    //                 console.debug(content);
    //                 // console.debug(test);
    //             }]);
    //
    //         }
    //     },
    // })

    app.controller('MainController', ['$scope', '$location', function ($scope, $location) {
        $scope._ = _;
        $scope.global = {
            dbname: undefined,
            database: {},
        }
        $scope.personal = {
            // static
            id: undefined,
            is_favorite: false,
            full_name: "-",
            actual_bank_hours: 0,
            actual_month_bank_hours: 0,
            introduction: "",
            diff_humain_creation_membre: "",
            antecedent_judiciaire_verifier: false,
            mon_accorderie: {
                name: "-",
                id: 0,
            },
            dct_offre_service: {},
            dct_demande_service: {},
            dct_offre_service_favoris: {},
            dct_demande_service_favoris: {},
            dct_membre_favoris: {},
            dct_echange: {},

            // calculate
            actual_bank_sign: true,
            actual_bank_time_diff: "00:00",
            actual_bank_time_human: "+ 0 heure",
            actual_bank_time_human_short: "0h",
            actual_bank_time_human_simplify: "0 heure",
            actual_month_bank_time_human_short: "0h",
            estPersonnel: true,
            dct_echange_mensuel: {},

            // is_in_offre_service_favoris: function () {
            //     return  $scope.offre_service_info.id in Objects.keys(offre_service_info);
            // },
            // is_in_demande_service_favoris: function () {
            //     return  $scope.demande_service_info.id in Objects.keys(demande_service_info);
            // },
        }
        $scope.membre_info = {}
        $scope.dct_membre = {}
        $scope.contact_info = {}
        $scope.offre_service_info = {}
        $scope.dct_offre_service_info = {}
        $scope.demande_service_info = {}
        $scope.dct_demande_service_info = {}
        $scope.echange_service_info = {}
        $scope.dct_echange_service_info = {}
        $scope.nb_offre_service = 0;
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

        $scope.add_to_my_favorite_field_id = function (model, record_id) {
            ajax.rpc("/accorderie/submit/my_favorite", {"model": model, "id_record": record_id}).then(function (data) {
                console.debug("AJAX receive add_to_my_favorite");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'add_to_my_favorite' data";
                    console.error($scope.error);
                } else {
                    // $scope.nb_offre_service = data.nb_offre_service;
                    // record_obj.is_favorite = data.is_favorite;
                    // if (model === "accorderie.membre" && data.is_favorite) {
                    //     // TODO validate not already in list
                    //     $scope.personal.lst_membre_favoris.push(record_obj);
                    // }
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        // Date
        $scope.load_date = function () {
            let time = require("web.time");
            // TODO not optimal how this is called, need only to be call 1 time when page is loaded (with date)
            console.debug("Call load_date");
            _.each($(".input-group.date"), function (date_field) {
                let minDate =
                    $(date_field).data("mindate") || moment({y: 1900});
                if ($(date_field).attr("date-min-today")) {
                    minDate = moment();
                }
                let maxDate =
                    $(date_field).data("maxdate") || moment().add(200, "y");
                if ($(date_field).attr("date-max-year")) {
                    maxDate = moment().add(1, "y").add(1, "d");
                }
                let inline =
                    $(date_field).attr("inline-date") && true || false;
                let sideBySide =
                    $(date_field).attr("side-by-side") && true || false;
                let calendarWeeks =
                    $(date_field).attr("calendar-weeks") && true || false;
                let dateFormatTool =
                    $(date_field).attr("date-format-tool") || false;

                let options = {
                    minDate: minDate,
                    maxDate: maxDate,
                    calendarWeeks: calendarWeeks,
                    icons: {
                        time: "fa fa-clock-o",
                        date: "fa fa-calendar",
                        next: "fa fa-chevron-right",
                        previous: "fa fa-chevron-left",
                        up: "fa fa-chevron-up",
                        down: "fa fa-chevron-down",
                    },
                    locale: moment.locale(),
                    allowInputToggle: true,
                    inline: inline,
                    sideBySide: sideBySide,
                    keyBinds: null,
                };
                if ($(date_field).find(".o_website_form_date").length > 0 || dateFormatTool === "date") {
                    options.format = time.getLangDateFormat();
                } else if (
                    $(date_field).find(".o_website_form_clock").length > 0 || dateFormatTool === "clock"
                ) {
                    // options.format = time.getLangTimeFormat();
                    options.format = "HH:mm";
                    options.defaultDate = moment("00:00", "HH:mm");
                } else {
                    options.format = time.getLangDatetimeFormat();
                }
                $("#" + date_field.id).datetimepicker(options);
            });
        }

        $scope.demander_un_service_sur_une_offre = function () {
            let input = $('#date_echange_id');
            let date_value = input.data().date;
            if (date_value.includes("/")) {
                // Bug, wrong format (why, load_date is called with specific format...), force it
                console.warn("Bug wrong format date, got '" + date_value + "' and expect format YYYY-MM-DD, force conversion.")
                date_value = moment(date_value).format("YYYY-MM-DD");
            }
            let membre_id = $scope.offre_service_info.membre_id;
            let offre_id = $scope.offre_service_info.id;
            let url = `/participer#!?state=init.saa.recevoir.choix.existant.time&membre=${membre_id}&offre_service=${offre_id}&date=${date_value}`;
            console.debug(url);
            // location.replace(url);
            window.location.href = url;
        }

        $scope.offrir_un_service_sur_une_demande = function () {
            // TODO wrong
            let input = $('#date_echange_id');
            let date_value = input.data().date;
            if (date_value.includes("/")) {
                // Bug, wrong format (why, load_date is called with specific format...), force it
                console.warn("Bug wrong format date, got '" + date_value + "' and expect format YYYY-MM-DD, force conversion.")
                date_value = moment(date_value).format("YYYY-MM-DD");
            }
            let membre_id = $scope.offre_service_info.membre_id;
            let offre_id = $scope.offre_service_info.id;
            let url = `/participer#!?state=init.saa.recevoir.choix.existant.time&membre=${membre_id}&offre_service=${offre_id}&date=${date_value}`;
            console.debug(url);
            // location.replace(url);
            window.location.href = url;
        }

        // Map
        $scope.show_map_member = false;

        // Share
        $scope.show_qrcode_modal = false;

        $scope.show_and_generate_qrcode = function () {
            $scope.show_qrcode_modal = true;
            let urlToCopy = $location.$$absUrl;
            new QRCode(document.getElementById("qrcode"), urlToCopy);
        }

        $scope.show_camera_qrcode_modal = false;
        $scope.list_camera_qrcode = [];
        $scope.show_camera_error = "";
        $scope.selectedCamera = undefined;
        $scope.show_camera_find_url = false;
        $scope.show_camera_link_find = undefined;
        $scope.html5QrCode = undefined;

        $scope.show_camera_select = function (option) {
            $scope.selectedCamera = option;
            $scope.show_camera_open();
        }

        $scope.show_camera_close = function () {
            if (!_.isUndefined($scope.html5QrCode)) {
                // TODO wrong technique to stop camera, use async method
                $scope.html5QrCode.stop().then((ignore) => {
                    // QR Code scanning is stopped.
                    $scope.html5QrCode = undefined;
                }).catch((err) => {
                    // Stop failed, handle it.
                });
            }
            $scope.show_camera_qrcode_modal = false
        }

        $scope.show_camera_qrcode = function () {
            $scope.show_camera_qrcode_modal = true;
            $scope.list_camera_qrcode = [];
            $scope.show_camera_error = "";
            $scope.selectedCamera = undefined;
            $scope.show_camera_link_find = undefined;
            Html5Qrcode.getCameras().then(devices => {
                /**
                 * devices would be an array of objects of type:
                 * { id: "id", label: "label" }
                 */
                $scope.list_camera_qrcode = devices;
                $scope.selectedCamera = devices[devices.length - 1];
                $scope.show_camera_open();
                $scope.$apply();
            }).catch(err => {
                $scope.show_camera_error = err;
                console.error(err);
                $scope.$apply();
            });
        }

        $scope.show_camera_open = function () {
            const html5QrCode = new Html5Qrcode(/* element id */ "reader");
            $scope.html5QrCode = html5QrCode;
            html5QrCode.start(
                $scope.selectedCamera.id,
                {
                    fps: 10,    // Optional, frame per seconds for qr code scanning
                    qrbox: {width: 250, height: 250}  // Optional, if you want bounded box UI
                },
                (decodedText, decodedResult) => {
                    // do something when code is read
                    $scope.show_camera_find_text(decodedText);
                },
                (errorMessage) => {
                    // parse error, ignore it.
                })
                .catch((err) => {
                    // Start failed, handle it.
                    console.error(err);
                    $scope.show_camera_error = err;
                    $scope.$apply();
                });
        }

        $scope.show_camera_find_text = function (decodedText) {
            $scope.show_camera_link_find = decodedText;
            // ignore 'www.'
            let decodedTextCut = decodedText.replace("www.", "");
            let locationText = window.location.origin.replace("www.", "");
            if (decodedTextCut.startsWith(locationText)) {
                // Find good link
                // TODO wrong technique to stop camera, use async method
                $scope.html5QrCode.stop().then((ignore) => {
                    // QR Code scanning is stopped.
                    $scope.html5QrCode = undefined;
                }).catch((err) => {
                    // Stop failed, handle it.
                });
                $scope.show_camera_error = "";
                $scope.show_camera_find_url = true;
                setTimeout(function () {
                    // location.replace(decodedText);
                    window.location.href = decodedText;
                }, 2000);
            } else {
                $scope.show_camera_error = "Le lien est erroné, provient-il de ce site?";
            }
            $scope.$apply();
        }

        $scope.error_copy = "";
        $scope.is_copied_url = false;
        $scope.copy_clipboard_url = function () {
            $scope.error_copy = "";
            $scope.is_copied_url = false;
            let urlToCopy = $location.$$absUrl;
            navigator.clipboard.writeText(urlToCopy).then(() => {
                $scope.is_copied_url = true;
            }, () => {
                $scope.error_copy = "Cannot copy URL";
            });
        }

        $scope.error_share = "";

        $scope.is_share_enable = function () {
            if (!navigator.canShare) {
                return false;
            }
            let urlToShare = $location.$$absUrl;
            let value = {title: "Page Accorderie", url: urlToShare}
            return navigator.canShare(value)
        }

        $scope.share_link = function () {
            if ($scope.is_share_enable()) {
                $scope.error_share = "";
                let urlToShare = $location.$$absUrl;
                let value = {title: "Page Accorderie", url: urlToShare}
                try {
                    navigator.share(value);
                } catch (err) {
                    $scope.error_share = err;
                }
            }
        }

        // End Share

        $scope.add_to_my_favorite = function (model, record_obj) {
            let id_record = record_obj.id;
            ajax.rpc("/accorderie/submit/my_favorite", {"model": model, "id_record": id_record}).then(function (data) {
                console.debug("AJAX receive add_to_my_favorite");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'add_to_my_favorite' data";
                    console.error($scope.error);
                } else {
                    // $scope.nb_offre_service = data.nb_offre_service;
                    record_obj.is_favorite = data.is_favorite;
                    // if (model === "accorderie.membre" && data.is_favorite) {
                    //     // TODO validate not already in list
                    //     $scope.personal.lst_membre_favoris.push(record_obj);
                    // }
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.update_db_my_personal_info = function () {
            ajax.rpc("/accorderie_canada_ddb/get_personal_information", {}).then(function (data) {
                console.debug("AJAX receive get_personal_information");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'get_personal_information' data";
                    console.error($scope.error);
                } else {
                    $scope.error = "";
                    $scope.global = data.global;
                    $scope.personal = data.personal;
                    $scope.update_personal_data();
                    console.debug($scope.personal);

                    $scope.update_db_list_membre($scope.personal.mon_accorderie.id);

                    // Special case, when need to get information of another member
                    let membre_id = $location.search()["membre_id"];
                    let membre_id_int = parseInt(membre_id);
                    if (window.location.pathname === "/monprofil/mapresentation" && !_.isUndefined(membre_id) && membre_id_int !== $scope.personal.id) {
                        // Force switch to another user
                        $scope.update_membre_info(membre_id_int, "membre_info");
                    } else {
                        console.debug("Setup membre personal.");
                        $scope.personal.estPersonnel = true;
                        $scope.membre_info = $scope.personal;
                    }
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.update_db_my_personal_info();

        $scope.update_membre_info = function (membre_id, scope_var_name_to_update) {
            ajax.rpc("/accorderie_canada_ddb/get_membre_information/" + membre_id).then(function (data) {
                console.debug("AJAX receive get_membre_information");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'get_membre_information' data";
                    console.error($scope.error);
                } else {
                    $scope.error = "";
                    data.membre_info.estPersonnel = false;
                    data.membre_info.show_date_creation = moment(data.date_creation).format("MMMM YYYY");
                    data.membre_info.show_bank_max_service_offert = $scope.convertNumToTime(data.membre_info.bank_max_service_offert, 4);
                    $scope[scope_var_name_to_update] = data.membre_info;
                    console.debug(data.membre_info);
                }
                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.get_href_participer_service_effectue = function (echange_service_info) {
            let status
            // if (!_.isUndefined(echange_service_info.demande_service) && !echange_service_info.estAcheteur) {
            //     status = `/participer#!?state=init.va.oui.form&echange_service=${echange_service_info.id}`;
            // } else if (echange_service_info.estAcheteur) {
            //     // TODO why need member?
            //     status = `/participer#!?state=init.va.non.recu.choix.form&membre=${echange_service_info.membre_id}&echange_service=${echange_service_info.id}`;
            // } else {
            //     status = `/participer#!?state=init.va.non.offert.existant.form&membre=${echange_service_info.membre_id}&echange_service=${echange_service_info.id}`;
            // }
            status = `/participer#!?state=init.va.oui.form&echange_service=${echange_service_info.id}`;
            return status;
        }

        $scope.update_db_nb_offre_service = function () {
            ajax.rpc("/accorderie_canada_ddb/get_info/nb_offre_service", {}).then(function (data) {
                console.debug("AJAX receive get_nb_offre_service");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'get_nb_offre_service' data";
                    console.error($scope.error);
                } else {
                    $scope.nb_offre_service = data.nb_offre_service;
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.load_page_offre_demande_echange_service = function () {
            let key = "/accorderie_canada_ddb/accorderie_offre_service/";
            if (window.location.pathname.indexOf(key) === 0) {
                // params can be 6?debug=1 or 6#!?str=3, need to extract first int
                let params = window.location.pathname.substring(key.length);
                params = parseInt(params, 10);
                if (!Number.isNaN(params)) {
                    ajax.rpc("/accorderie_canada_ddb/get_info/get_offre_service/" + params).then(function (data) {
                        console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_offre_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_offre_service' data";
                            console.error($scope.error);
                        } else {
                            $scope.offre_service_info = data;
                            $scope.update_membre_info($scope.offre_service_info.membre_id, "contact_info");
                        }

                        // Process all the angularjs watchers
                        $scope.$digest();
                    })
                }
            }
            key = "/offresservice";
            if (window.location.pathname.indexOf(key) === 0) {
                ajax.rpc("/accorderie_canada_ddb/get_info/all_offre_service").then(function (data) {
                    console.debug("AJAX receive /accorderie_canada_ddb/get_info/all_offre_service");
                    if (data.error || !_.isUndefined(data.error)) {
                        $scope.error = data.error;
                        console.error($scope.error);
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty '/accorderie_canada_ddb/get_info/all_offre_service' data";
                        console.error($scope.error);
                    } else {
                        $scope.dct_offre_service_info = data;
                    }

                    // Process all the angularjs watchers
                    $scope.$digest();
                })
            }
            key = "/demandesservice";
            if (window.location.pathname.indexOf(key) === 0) {
                ajax.rpc("/accorderie_canada_ddb/get_info/all_demande_service").then(function (data) {
                    console.debug("AJAX receive /accorderie_canada_ddb/get_info/all_demande_service");
                    if (data.error || !_.isUndefined(data.error)) {
                        $scope.error = data.error;
                        console.error($scope.error);
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty '/accorderie_canada_ddb/get_info/all_demande_service' data";
                        console.error($scope.error);
                    } else {
                        $scope.dct_demande_service_info = data;
                    }

                    // Process all the angularjs watchers
                    $scope.$digest();
                })
            }
            key = "/accorderie_canada_ddb/accorderie_demande_service/";
            if (window.location.pathname.indexOf(key) === 0) {
                // params can be 6?debug=1 or 6#!?str=3, need to extract first int
                let params = window.location.pathname.substring(key.length);
                params = parseInt(params, 10);
                if (!Number.isNaN(params)) {
                    ajax.rpc("/accorderie_canada_ddb/get_info/get_demande_service/" + params).then(function (data) {
                        console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_demande_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_demande_service' data";
                            console.error($scope.error);
                        } else {
                            $scope.demande_service_info = data;
                            $scope.update_membre_info($scope.demande_service_info.membre_id, "contact_info");
                        }

                        // Process all the angularjs watchers
                        $scope.$digest();
                    })
                }
            }

            let echange_id = $location.search()["echange"];
            if (!_.isEmpty(echange_id)) {
                echange_id = parseInt(echange_id, 10);
                if (!Number.isNaN(echange_id)) {
                    ajax.rpc("/accorderie_canada_ddb/get_info/get_echange_service/" + echange_id).then(function (data) {
                        console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_echange_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_echange_service' data";
                            console.error($scope.error);
                        } else {
                            $scope.echange_service_info = data;

                            let sign = data.estAcheteur ? -1 : 1;
                            $scope.echange_service_info.sign = sign;
                            $scope.echange_service_info.show_duree_estime = $scope.convertNumToTime(data.duree_estime * sign, 7);
                            $scope.echange_service_info.show_duree = $scope.convertNumToTime(data.duree * sign, 7);
                            $scope.echange_service_info.show_duree_trajet_estime = $scope.convertNumToTime(data.duree_trajet_estime * sign, 7);
                            $scope.echange_service_info.show_duree_trajet = $scope.convertNumToTime(data.duree_trajet * sign, 7);
                            $scope.echange_service_info.show_duree_estime_pos = $scope.convertNumToTime(data.duree_estime, 8);
                            $scope.echange_service_info.show_duree_pos = $scope.convertNumToTime(data.duree, 8);
                            $scope.echange_service_info.show_duree_trajet_estime_pos = $scope.convertNumToTime(data.duree_trajet_estime, 8);
                            $scope.echange_service_info.show_duree_trajet_pos = $scope.convertNumToTime(data.duree_trajet, 8);

                            $scope.echange_service_info.show_total_dure_estime = $scope.convertNumToTime(data.duree_estime + data.duree_trajet_estime, 7);
                            $scope.echange_service_info.show_total_dure = $scope.convertNumToTime(data.duree + data.duree_trajet, 7);
                            $scope.echange_service_info.show_total_dure_estime_pos = $scope.convertNumToTime(data.duree_estime + data.duree_trajet_estime, 8);
                            $scope.echange_service_info.show_total_dure_pos = $scope.convertNumToTime(data.duree + data.duree_trajet, 8);

                            $scope.echange_service_info.show_date = moment(data.date).format("dddd D MMMM");
                            $scope.echange_service_info.show_start_time = moment(data.date).format("H") + "h" + moment(data.date).format("mm");
                            $scope.echange_service_info.show_end_time = moment(data.end_date).format("H") + "h" + moment(data.end_date).format("mm");

                            $scope.update_membre_info($scope.echange_service_info.membre_id, "contact_info");

                            console.debug($scope.echange_service_info);
                        }

                        // Process all the angularjs watchers
                        $scope.$digest();
                    })
                }
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

        $scope.closeModalForm = function () {
            console.debug("close");
            $scope.show_submit_modal = false;
            let modal = document.getElementsByClassName("modal_pub_offre");
            if (!_.isUndefined(modal) && !_.isEmpty(modal)) {
                modal[0].classList.remove("show");
            }
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
                    $scope.animationShowPresentation(name, "Publier une offre de service individuelle", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.pos and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.pos"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on individuelle
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.pos.single"]', generic_timer_ms, newValue + 1, false, true, false)
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
                    $scope.animationShowPresentation(name, "Publier une demande de service individuelle", presentation_timer_ms, newValue + 1)
                } else if (newValue === 2) {
                    // select init.pds and click on suivant
                    setTimeout(function () {
                        $scope.animationSelectorToSelector(name, '[for="init.pds"]', '#nextBtn', generic_timer_ms, newValue + 1, true, true, false)
                    }, 500);
                } else if (newValue === 3) {
                    // click on individuelle
                    $scope.animationSelectorToSelector(name, '#nextBtn', '[for="init.pds.single"]', generic_timer_ms, newValue + 1, false, true, false)
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

        $scope.load_page_offre_demande_echange_service();

        $scope.update_db_list_membre = function (accorderie_id) {
            ajax.rpc("/accorderie_canada_ddb/get_info/list_membre", {"accorderie_id": accorderie_id}).then(function (data) {
                console.debug("AJAX receive /accorderie_canada_ddb/get_info/list_membre");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty '/accorderie_canada_ddb/get_info/list_membre' data";
                    console.error($scope.error);
                } else {
                    console.debug(data.dct_membre);
                    $scope.dct_membre = data.dct_membre;
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.update_db_nb_offre_service();

        $scope.getDatabaseInfo = function (model, field_id) {
            // TODO compete this, suppose to update database value and use cache
            if (model === "accorderie.offre.service") {
                return $scope.dct_offre_service_info[field_id];
            } else if (model === "accorderie.demande.service") {
                return $scope.dct_demande_service_info[field_id];
            }
        }

        // $scope.forceRefreshAngularJS = function () {
        //     // console.debug("Force refresh AngularJS");
        //     // $scope.$digest();
        //     compileAngularElement(".o_affix_enabled");
        // }

        $scope.convertNumToTime = function (number, format = 0) {
            // format 0 : 1.0 -> 1:00, 1.75 -> 1:45, -.75 -> -0:45
            // format 1 : 1.0 -> +1:00, 1.75 -> +1:45, -.75 -> -0:45
            // format 2 : 1.0 -> + 1:00, 1.75 -> + 1:45, -.75 -> - 0:45
            // format 3 : 1.0 -> + 1h, 1.75 -> + 1h45, -.75 -> - 0h45
            // format 4 : 1.0 -> 1h, 1.75 -> 1h45, -.75 -> -0h45
            // format 5 : 2.0 -> + 2 heures, 1.75 -> + 1 heure 45, -.75 -> - 0 heure 45
            // format 6 : 2.0 -> 2 heures, 1.75 -> 1 heure 45, -.75 -> - 0 heure 45
            // format 7 : 1.0 -> + 1h00, 1.75 -> + 1h45, -.75 -> - 0h45
            // format 8 : 1.0 -> 1h00, 1.75 -> + 1h45, -.75 -> - 0h45
            // format 9 : 1.0 -> 01:00, 1.75 -> 01:45, -.75 -> -00:45

            if (format > 9 || format < 0) {
                format = 0;
            }

            // Check sign of given number
            let sign = (number >= 0) ? 1 : -1;

            // Set positive value of number of sign negative
            number = number * sign;

            // Separate the int from the decimal part
            let hour = Math.floor(number);
            let decPart = number - hour;

            if (format === 9 && hour.length < 2) {
                hour = '0' + hour;
            }

            let min = 1 / 60;
            // Round to nearest minute
            decPart = min * Math.round(decPart / min);

            let minute = Math.floor(decPart * 60) + '';

            // Add padding if need
            if (minute.length < 2) {
                minute = '0' + minute;
            }

            // Add Sign in final result
            if (format === 0 || format === 9) {
                sign = sign === 1 ? '' : '-';
            } else {
                sign = sign === 1 ? '+' : '-';
            }

            // Concat hours and minutes
            let newTime;
            if (format === 0 || format === 1 || format === 9) {
                newTime = sign + hour + ':' + minute;
            } else if (format === 2) {
                newTime = sign + ' ' + hour + ':' + minute;
            } else if (format === 3 || format === 4 || format === 7 || format === 8) {
                if (minute > 0 || format === 7 || format === 8) {
                    if ((format === 4 || format === 8) && sign === "+") {
                        newTime = hour + 'h' + minute;
                    } else {
                        newTime = sign + ' ' + hour + 'h' + minute;
                    }
                } else {
                    if (format === 4 && sign === "+") {
                        newTime = hour + 'h';
                    } else {
                        newTime = sign + ' ' + hour + 'h';
                    }
                }
            } else if (format === 5 || format === 6) {
                let hour_str = _t("heure");
                if (hour > 1) {
                    hour_str += 's';
                }
                if (minute > 0) {
                    if (format === 6 && sign === "+") {
                        newTime = hour + ' ' + hour_str + ' ' + minute;
                    } else {
                        newTime = sign + ' ' + hour + ' ' + hour_str + ' ' + minute;
                    }
                } else {
                    if (format === 6 && sign === "+") {
                        newTime = hour + ' ' + hour_str;
                    } else {
                        newTime = sign + ' ' + hour + ' ' + hour_str;
                    }
                }
            }

            return newTime;
        }

        $scope.update_personal_data = function () {
            // Time management
            // + 15:30 // format 2
            // + 15h // format 3
            // 15h // format 4
            // + 15 heure 30 // format 5
            // 15 heure 30 // format 6
            let time_bank = $scope.personal.actual_bank_hours;
            $scope.personal.actual_bank_sign = (time_bank >= 0);
            $scope.personal.actual_bank_time_diff = $scope.convertNumToTime(time_bank, 2);
            $scope.personal.actual_bank_time_human_short = $scope.convertNumToTime(time_bank, 3);
            $scope.personal.actual_bank_time_human = $scope.convertNumToTime(time_bank, 5);
            $scope.personal.actual_bank_time_human_simplify = $scope.convertNumToTime(time_bank, 6);

            $scope.personal.actual_month_bank_time_human_short = $scope.convertNumToTime($scope.personal.actual_month_bank_hours, 4);

            let month_key = moment(Date.now()).format("MMMM YYYY");
            $scope.personal.dct_echange_mensuel = {};
            $scope.personal.dct_echange_mensuel[month_key] = {
                "lst_echange": [],
                "actualMonth": true,
                "containTransactionValide": false
            };

            // Order list by month and year
            for (const [key, value] of Object.entries($scope.personal.dct_echange)) {
                let inner_obj;
                let month_key = moment(value.date).format("MMMM YYYY");
                if ($scope.personal.dct_echange_mensuel.hasOwnProperty(month_key)) {
                    inner_obj = $scope.personal.dct_echange_mensuel[month_key];
                } else {
                    inner_obj = {"lst_echange": [], "actualMonth": false, "containTransactionValide": false};
                    $scope.personal.dct_echange_mensuel[month_key] = inner_obj;
                }

                if (value.transaction_valide) {
                    inner_obj.containTransactionValide = true;
                }

                value.show_date = moment(value.date).format("dddd D MMMM");
                value.show_start_time = moment(value.date).format("H") + "h" + moment(value.date).format("mm");
                value.show_end_time = moment(value.end_date).format("H") + "h" + moment(value.end_date).format("mm");

                let sign = value.estAcheteur ? -1 : 1;
                value.show_duree_estime = $scope.convertNumToTime(value.duree_estime * sign, 7);
                value.show_duree = $scope.convertNumToTime(value.duree * sign, 7);
                value.show_duree_total_estime = $scope.convertNumToTime((value.duree_estime + value.duree_trajet_estime) * sign, 7);
                value.show_duree_total = $scope.convertNumToTime((value.duree + value.duree_trajet) * sign, 7);
                value.sign = sign;

                inner_obj.lst_echange.push(value);
            }
            for (const [key, value] of Object.entries($scope.personal.dct_echange_mensuel)) {
                // TODO detect if its this month
                value.sum_time = 0;
                for (let i = 0; i < value.lst_echange.length; i++) {
                    let i_echange = value.lst_echange[i];
                    if (i_echange.transaction_valide) {
                        // let duration = i_echange.transaction_valide ? i_echange.duree : i_echange.duree_estime;
                        let duration = i_echange.duree + i_echange.duree_trajet;
                        if (i_echange.estAcheteur) {
                            value.sum_time -= duration;
                        } else {
                            value.sum_time += duration;
                        }
                    }
                }
                value.show_sum_time = $scope.convertNumToTime(value.sum_time, 3);
            }
            console.debug($scope.personal.dct_echange_mensuel);
        }

        $scope.echange_click_redirect = function (echange) {
            // TODO no need this, use instead <a href and not ng-click
            window.location.href = '/monactivite/echange#!?echange=' + echange.id;
        }
    }])

    async function requestSpecialURL($scope, state, new_url) {
        let value = await ajax.rpc(new_url, {}).then(function (data) {
            console.debug("AJAX receive " + new_url);
            console.debug(data);

            if (data.error) {
                $scope.error = data.error;
            } else if (_.isEmpty(data)) {
                $scope.error = "Empty data - " + new_url;
            } else {
                return data.data;
            }
        });

        console.debug(value);
        // Synchronise database
        $scope.data[state.data_name] = value[state.data_name];
        state.data = value[state.data_name];
        $scope._update_state(state)
        // Process all the angularjs watchers and scope, need it for $location.search()
        $scope.$apply();
    }

    app.controller('OffreDemandeService', ['$scope', function ($scope) {
        $scope.service_id = undefined;
        $scope.service = {
            "id": 0,
            "description": undefined,
            "titre": undefined,
            "is_favorite": undefined,
            "distance": undefined,
            "membre_id": undefined,
            "membre": undefined,
            "diff_create_date": undefined,
        }
        $scope.model = undefined;
        $scope.service_enable_href = true;
        $scope.service_enable_favorite = true;
        $scope.type_service = 'offre'; // or 'demande'

        $scope.$on("notify_favorite", function ($event, message) {
            // Receive notification from server
            if (message.model === $scope.model && message.field_id === $scope.service.id) {
                $scope.service.is_favorite = message.status;
            }
        })

        $scope.getDatabaseInfo = function () {
            console.debug("Get database info model '" + $scope.model + "' and field_id '" + $scope.service_id + "'");
            if (_.isUndefined($scope.service_id)) {
                console.error("service_id is undefined from model '" + $scope.model + "'");
            } else if ($scope.model === "accorderie.offre.service") {
                let value = $scope.$parent.dct_offre_service_info[$scope.service_id];
                if (!_.isUndefined(value)) {
                    $scope.service = value;
                }
                ajax.rpc("/accorderie_canada_ddb/get_info/get_offre_service/" + $scope.service_id).then(function (data) {
                    console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_offre_service");
                    if (data.error || !_.isUndefined(data.error)) {
                        $scope.error = data.error;
                        console.error($scope.error);
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_offre_service' data";
                        console.error($scope.error);
                    } else {
                        $scope.service = data;
                        $scope.$parent.dct_offre_service_info[$scope.service_id] = data;
                        $scope.$digest();
                    }
                })
            } else if ($scope.model === "accorderie.demande.service") {
                let value = $scope.$parent.dct_demande_service_info[$scope.service_id];
                if (!_.isUndefined(value)) {
                    $scope.service = value;
                }
                ajax.rpc("/accorderie_canada_ddb/get_info/get_demande_service/" + $scope.service_id).then(function (data) {
                    console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_demande_service");
                    if (data.error || !_.isUndefined(data.error)) {
                        $scope.error = data.error;
                        console.error($scope.error);
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_demande_service' data";
                        console.error($scope.error);
                    } else {
                        $scope.service = data;
                        $scope.$parent.dct_demande_service_info[$scope.service_id] = data;
                        $scope.$digest();
                    }
                })
            } else {
                console.error("Cannot support model '" + $scope.model + "' synchronise data");
            }
        }

    }])

    app.controller('EchangeService', ['$scope', function ($scope) {
        $scope.echange_service_id = undefined;
        $scope.echange_service = {
            "id": 0,
            "transaction_valide": undefined,
            "date": undefined,
            "temps": undefined,
            "duree_estime": undefined,
            "duree": undefined,
            "duree_trajet_estime": undefined,
            "duree_trajet": undefined,
            "commentaire": undefined,
            "estAcheteur": undefined,
            "membre_id": undefined,
            "membre": {
                "id": undefined,
                "full_name": undefined,
            },
            "end_date": undefined,
            "offre_service": undefined,
            "demande_service": undefined,
        }
        $scope.update_form = false;

        $scope.getDatabaseInfo = function () {
            console.debug("Get database echange service id '" + $scope.echange_service_id + "'");
            // Ignore when echange_service_id is missing
            if (!_.isUndefined($scope.echange_service_id)) {
                let value = $scope.$parent.dct_echange_service_info[$scope.echange_service_id];
                if (!_.isUndefined(value)) {
                    $scope.echange_service = value;
                }
                ajax.rpc("/accorderie_canada_ddb/get_info/get_echange_service/" + $scope.echange_service_id).then(function (data) {
                    console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_echange_service");
                    if (data.error || !_.isUndefined(data.error)) {
                        $scope.error = data.error;
                        console.error($scope.error);
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_echange_service' data";
                        console.error($scope.error);
                    } else {
                        $scope.echange_service = data;
                        $scope.$parent.dct_echange_service_info[$scope.echange_service_id] = data;
                        console.debug(data);
                        if ($scope.update_form) {
                            // $scope.form["date_service"] = data.date;
                            // $scope.form["time_service"] = data.temps;
                            $scope.form["date_service"] = moment(data.date).format("YYYY-MM-DD");
                            $scope.form["time_service"] = moment(data.date).format("HH:mm");

                            // $scope.form["time_realisation_service"] = data.duree;
                            // $scope.form["time_dure_trajet"] = data.duree_trajet;
                            // $scope.form["time_service_estimated"] = data.duree_estime;
                            // $scope.form["time_drive_estimated"] = data.duree_trajet_estime;

                            // Copied estimated value to real value for form
                            $scope.form["time_realisation_service"] = $scope.convertNumToTime(data.duree_estime, 9);
                            $scope.form["time_dure_trajet"] = $scope.convertNumToTime(data.duree_trajet_estime, 9);

                            $scope.form["frais_trajet"] = data.frais_trajet
                            $scope.form["frais_materiel"] = data.frais_materiel

                            $scope.form["membre_id"] = {
                                "id": data.membre.id,
                                "value": data.membre.full_name,
                            }

                            if (!_.isEmpty(data.commentaire)) {
                                $scope.form["commentaires"] = data.commentaire;
                            }
                        }
                        $scope.$digest();
                    }
                })
            }
        }
    }])

    app.controller('ParticiperController', ['$scope', '$location', function ($scope, $location) {
        $scope._ = _;
        $scope.has_init = false;
        $scope.error = "";
        $scope.workflow = {};
        $scope.data = {};
        $scope.data_inner = {};
        $scope.state = {
            id: undefined,
            message: "",
            type: "",
            list: undefined,
            list_is_first_position: undefined,
            disable_question: false,
            next_id: undefined,
            next_id_data: undefined,
            show_breadcrumb: false,
            data: undefined,
            data_name: undefined,
            model_field_depend: undefined,
            data_url_field: undefined,
            data_update_url: undefined,
            force_update_data: undefined,
            dct_data: undefined,
            data_inner: undefined,
            dct_data_inner: undefined,
            breadcrumb_value: undefined,
            breadcrumb_show_only_last_item: false,
            breadcrumb_field_value: undefined,
            submit_button_text: undefined,
            submit_response_title: undefined,
            submit_response_description: undefined,
            selected_value: undefined,
            selected_obj_value: undefined,
            selected_id: undefined,
            selected_tree_id: undefined,
            model_field_name_alias: undefined,
            model_field_name: undefined,
        };
        $scope.stack_breadcrumb_state = [];
        $scope.stack_breadcrumb_inner_state = [];
        $scope.actual_inner_state_name = "";
        $scope.in_multiple_inner_state = false; // true when a state need multiple interaction before show next
        $scope.is_inner_state = false; // true when a state need multiple interaction
        $scope.is_next_wait_value = false;
        $scope.lst_label_breadcrumb = [];
        $scope.autoCompleteJS = undefined;
        $scope.originChooseMemberPlaceholder = "Nom de la personne";
        $scope.chooseMemberPlaceholder = $scope.originChooseMemberPlaceholder;
        $scope.form = {};
        $scope.tmpForm = {
            modelChooseMember: "",
        };
        $scope.show_submit_modal = false;
        $scope.submitted_url = "";

        // Add animation
        $scope.$parent.animationRecord.lstAnimation.push("Créer une offre de service publique individuelle");
        $scope.$parent.animationRecord.lstAnimation.push("Créer une demande de service publique individuelle");
        $scope.$parent.animationRecord.lstAnimation.push("Créer un échange en tant que personne offrant le service avec une offre existante");
        $scope.$parent.animationRecord.lstAnimation.push("Créer un échange en tant que personne recevant le service d’une offre existante");
        $scope.$parent.animationRecord.lstAnimation.push("Créer un échange en tant que personne offrant le service avec une offre qui doit être créée");
        $scope.$parent.animationRecord.lstAnimation.push("Créer un échange en tant que personne recevant le service d’une demande qui doit être créée");
        $scope.$parent.animationRecord.lstAnimation.push("Valider un échange existant");
        $scope.$parent.animationRecord.lstAnimation.push("Valider un échange inexistant lorsqu’on est la personne qui a offert le service sur une offre créée");
        $scope.$parent.animationRecord.lstAnimation.push("Valider un échange inexistant lorsqu’on est la personne qui a demandé le service sur une offre créée");
        $scope.$parent.animationRecord.lstAnimation.push("Valider un échange inexistant lorsqu’on est la personne qui a offert le service sur une offre qui doit être créée");
        $scope.$parent.animationRecord.lstAnimation.push("Valider un échange inexistant lorsqu’on est la personne qui a demandé le service sur une demande qui doit être créée");

        let url = "/accorderie_canada_ddb/get_participer_workflow_data/";
        ajax.rpc(url, {}).then(function (data) {
            console.debug("AJAX receive get_participer_workflow_data");
            if (data.error) {
                $scope.error = data.error;
            } else if (_.isEmpty(data)) {
                $scope.error = "Empty data - " + url;
            } else if (!data.workflow.hasOwnProperty(INIT_STATE)) {
                let str_error = "Missing state '" + INIT_STATE + "'.";
                console.error(str_error);
                $scope.error = str_error;
                $scope.workflow = {};
                $scope.state = {};
                $scope.data = {};
                $scope.data_inner = {};
            } else {
                // Init controller or call change_state_name(name)
                $scope.error = "";
                $scope.workflow = data.workflow;
                $scope.data = data.data;
                $scope.data_inner = data.data_inner;

                // Update relation workflow with data, use by click_inner_state
                for (const [key, value] of Object.entries($scope.workflow)) {
                    if (!_.isEmpty(value.data_name)) {
                        let data_name = value.data_name;

                        // data
                        let lst_data = $scope.data[data_name]
                        if (_.isUndefined(lst_data)) {
                            console.warn("Cannot find database '" + data_name + "'.");
                            $scope.workflow[key].data = undefined;
                            continue;
                        }
                        $scope.workflow[key].data = lst_data;
                        let dct_data = {};
                        for (let i = 0; i < lst_data.length; i++) {
                            dct_data[lst_data[i].id] = lst_data[i];
                        }
                        $scope.workflow[key].dct_data = dct_data;

                        // data_inner
                        let dct_data_inner = $scope.data_inner[data_name];
                        if (!_.isUndefined(dct_data_inner)) {
                            $scope.workflow[key].dct_data_inner = dct_data_inner;
                        }
                    }
                }

                // fill $scope.state with change_from_url
                $scope.change_from_url($location.search());
            }

            // Process all the angularjs watchers
            $scope.$digest();
        })

        $scope.init_controller = function (state = INIT_STATE) {
            // $scope.has_init = true;
            $scope.stack_breadcrumb_state = [];
            if (state !== INIT_STATE) {
                let lstState = state.split('.');

                let stateName = "";
                for (let i = 0; i < lstState.length - 1; i++) {
                    // Ignore last state, will be added after when load
                    if (_.isEmpty(stateName)) {
                        stateName = lstState[i];
                    } else {
                        stateName += "." + lstState[i];
                    }
                    console.log("Load state '" + stateName + "'");
                    let searchedState = $scope.workflow[stateName];
                    if (!_.isUndefined(searchedState)) {
                        $scope.stack_breadcrumb_state.push(searchedState);
                        $scope.reinit_state_model_field(searchedState);
                        $scope.fill_model_form_from_state(searchedState);
                    } else {
                        console.warn("Missing state " + stateName);
                    }
                }
            }
            $scope.change_state_name(state);
        }

        // Member
        $scope._load_member = function (data) {
            $scope.autoCompleteJS = new autoComplete(
                {
                    selector: "#chooseMember",
                    // placeHolder: "Nom de la personne",
                    data: {
                        src: data,
                        keys: ["title"],
                        cache: true,
                    },
                    resultItem: {
                        element: (element, data) => {
                            element.innerHTML = `<img style="width:50px; aspect-ratio: 1;" src="${data.value.img}" class="nav_pic rounded-circle"/>${data.match}`
                        },
                        highlight: true,
                    },
                    events: {
                        input: {
                            selection: (event) => {
                                let value = event.detail.selection.value.title;
                                // let index = event.detail.selection.index;
                                $scope.autoCompleteJS.input.value = value;
                                // $scope.state.selected_id = data_list[index].id;
                                $scope.state.selected_id = event.detail.selection.value.id;
                                $scope.state.selected_value = value;
                                $scope.state.selected_obj_value = event.detail.selection.value;
                                $scope.autoCompleteJS.unInit();
                                // Process all the angularjs watchers
                                $scope.$digest();
                            },
                            focus() {
                                const inputValue = $scope.autoCompleteJS.input.value;
                                if (inputValue.length) {
                                    $scope.autoCompleteJS.start();
                                }
                            },
                            open() {
                                const position =
                                    $scope.autoCompleteJS.input.getBoundingClientRect().bottom + $scope.autoCompleteJS.list.getBoundingClientRect().height >
                                    (window.innerHeight || document.documentElement.clientHeight);

                                if (position) {
                                    $scope.autoCompleteJS.list.style.bottom = $scope.autoCompleteJS.input.offsetHeight + 8 + "px";
                                } else {
                                    $scope.autoCompleteJS.list.style.bottom = -$scope.autoCompleteJS.list.offsetHeight - 8 + "px";
                                }
                            },
                        }
                    },
                    resultsList: {
                        element: (list, data) => {
                            const message = document.createElement("div");
                            if (!data.results.length) {
                                // Create "No Results" message list element
                                message.setAttribute("class", "no_result");
                                // Add message text content
                                message.innerHTML = `<span>Aucun résultat trouvé pour &nbsp;"${data.query}"</span>`;
                            } else {
                                message.innerHTML = `<strong>${data.results.length}</strong>&nbsp; sur &nbsp;<strong>${data.matches.length}</strong> &nbsp; résultats`;
                            }
                            // Add message list element to the list
                            list.prepend(message);
                        },
                        maxResults: 10,
                        noResults: true,
                        highlight: {
                            render: true,
                        },
                    },
                    // searchEngine: "loose",
                    searchEngine: "strict",
                },
            );
        }

        $scope.load_member = function () {
            // if (!_.isEmpty($scope.state.selected_value)) {
            //     document.getElementById("chooseMember").value = $scope.state.selected_value;
            //     return;
            // }
            // Need this function to detect state type is choix_membre and finish render before instance autoComplete
            if (_.isUndefined($scope.autoCompleteJS) && $scope.state.type === 'choix_membre' && $scope.chooseMemberPlaceholder !== "En attente...") {
                $scope.chooseMemberPlaceholder = "En attente..."
                $scope.chooseMemberPlaceholder = $scope.originChooseMemberPlaceholder;

                // detect parameters
                let param_name;
                if (!_.isUndefined($scope.state.model_field_name_alias)) {
                    param_name = $scope.state.model_field_name_alias;
                } else if (!_.isUndefined($scope.state.model_field_name)) {
                    param_name = $scope.state.model_field_name;
                }

                // fill value if params
                if (!_.isUndefined(param_name)) {
                    let obj_selected_value = parseInt($location.search()[param_name]);
                    if (Number.isInteger(obj_selected_value)) {
                        let dct_data = $scope.state.dct_data[obj_selected_value];
                        if (!_.isUndefined(dct_data)) {
                            $scope.state.selected_id = obj_selected_value;
                            $scope.state.selected_obj_value = dct_data;
                            $scope.state.selected_value = dct_data.title;
                        } else {
                            $scope.error = `Cannot find data 'membre' of ${obj_selected_value}`;
                            console.error($scope.error);
                        }
                    }
                }

                if (!_.isEmpty($scope.state.selected_value)) {
                    // autoCompleteJS is unInit
                    // $scope.autoCompleteJS.input.value = $scope.state.selected_value;
                    document.getElementById("chooseMember").value = $scope.state.selected_value;
                } else {
                    $scope._load_member($scope.state.data);
                }
            }
        }

        $scope.remove_member = function () {
            $scope.state.selected_id = undefined;
            if (!_.isUndefined($scope.autoCompleteJS)) {
                $scope.autoCompleteJS.init();
            } else {
                $scope._load_member($scope.state.data);
            }
            $scope.autoCompleteJS.input.value = ""
            $scope.state.selected_value = ""
            $scope.state.selected_obj_value = undefined
        }

        // History
        $scope.$on('$locationChangeSuccess', function (object, newLocation, previousLocation) {
            // Check this is not call before ajax to fill $scope.workflow
            // TODO has_init is always false
            // TODO optimization, each time click next, $locationChangeSuccess and init_controller is recall
            // TODO optimization, all variable is destroy and reconstruct with many loop
            if (!_.isEmpty($scope.workflow) && !$scope.has_init) {
                // Try to detect loop
                if ($location.search().state !== $scope.state.id) {
                    // This break previous button
                    console.debug("Call change_from_url " + $location.search());
                    $scope.change_from_url($location.search());
                } else {
                    console.debug("Block looping update location change");
                }
            }
        });

        $scope.change_from_url = function (search_params) {
            let paramSelectedModel = search_params[PARAM_STATE_NAME];
            if (_.isEmpty(paramSelectedModel)) {
                $scope.init_controller();
            } else {
                $scope.init_controller(paramSelectedModel);
            }
        }

        // Form
        $scope.change_state_to_field_id = function (field_id_name) {
            // TODO find in workflow the state of update this field and call $scope.change_state_name()
            console.debug("Change state to field name '" + field_id_name + "'");
            console.debug($scope.form);
        }

        $scope.form_is_nouveau_except_pos = function (state) {
            // nouvelle offre/demande sur un échange
            return !_.isUndefined(state.caract_echange_nouvel_existant) &&
                ["Nouvelle offre", "Nouvelle demande"].includes(state.caract_offre_demande_nouveau_existante);
        }

        $scope.form_is_nouveau = function (state) {
            // nouvelle offre/demande
            return ["Nouvelle offre", "Nouvelle demande"].includes(state.caract_offre_demande_nouveau_existante);
        }

        $scope.form_is_offre_demande_service = function (state) {
            return !_.isUndefined(state.caract_offre_demande_nouveau_existante) &&
                _.isUndefined(state.caract_service_offrir_recevoir) &&
                _.isUndefined(state.caract_echange_nouvel_existant);
        }

        $scope.form_is_service = function (state) {
            // TODO this is wrong
            return !_.isUndefined(state.caract_valider_echange) || [
                'init.saa.offrir.existant.form',
                'init.saa.recevoir.choix.nouveau.form',
            ].includes(state.id);
        }

        $scope.form_is_nouvelle_offre = function (state) {
            return state.caract_offre_demande_nouveau_existante === "Nouvelle offre" &&
                _.isUndefined(state.caract_service_offrir_recevoir) &&
                _.isUndefined(state.caract_echange_nouvel_existant);
        }

        $scope.form_is_nouvelle_demande = function (state) {
            return state.caract_offre_demande_nouveau_existante === "Nouvelle demande" &&
                _.isUndefined(state.caract_service_offrir_recevoir) &&
                _.isUndefined(state.caract_echange_nouvel_existant);
        }

        $scope.form_is_service_to_modify = function (state) {
            return state.caract_offre_demande_nouveau_existante === "Offre existante" &&
                state.caract_service_offrir_recevoir === "Service à recevoir" &&
                _.isUndefined(state.caract_valider_echange);
        }

        $scope.form_is_service_and_service_prevu = function (state) {
            // TODO this is a hack because calling {{load_date()}} in page not working some time
            // Est échange
            $scope.load_date();
            return !_.isUndefined(state.caract_echange_nouvel_existant);
        }

        $scope.form_is_nouvel_echange_service_offrir_offre_existante = function (state) {
            return state.caract_echange_nouvel_existant === "Nouvel échange" &&
                state.caract_service_offrir_recevoir === "Service à offrir" &&
                state.caract_offre_demande_nouveau_existante === "Offre existante";
        }

        $scope.form_is_valider_echange = function (state) {
            return !_.isUndefined(state.caract_valider_echange);
        }

        $scope.form_is_echange_pas_valider = function (state) {
            return _.isUndefined(state.caract_valider_echange) &&
                !_.isUndefined(state.caract_echange_nouvel_existant);
        }

        $scope.form_is_recevoir_not_valider = function (state) {
            return _.isUndefined(state.caract_valider_echange) &&
                state.caract_service_offrir_recevoir === "Service à recevoir";
        }

        $scope.form_is_exist_echange_to_validate = function (state) {
            return !_.isUndefined(state.caract_valider_echange) &&
                state.caract_echange_nouvel_existant === "Échange existant";
        }

        $scope.form_is_echange_sur_offre_demande_existante = function (state) {
            return !_.isUndefined(state.caract_echange_nouvel_existant) &&
                ["Offre existante", "Demande existante"].includes(state.caract_offre_demande_nouveau_existante);
        }

        $scope.form_is_frais_trajet_distance = function (state) {
            // TODO why «all service», not validate; exclude service.offrir + offre.nouvelle ??
            // TODO not validate : isUndefined($scope.state.caract_valider_echange)
            return [
                'init.saa.offrir.nouveau.cat.form',
                'init.saa.recevoir.choix.nouveau.form',
                'init.saa.recevoir.choix.existant.time.form'
            ].includes(state.id)
        }

        $scope.form_is_frais_trajet_prix = function (state) {
            // TODO why «all validate service», include service.offrir + offre.nouvelle + not validate
            // TODO ou service - form_frais_trajet_distance()
            return !_.isUndefined(state.caract_valider_echange) || [
                'init.saa.offrir.existant.form',
            ].includes(state.id)
        }

        $scope.form_is_commentaire = function (state) {
            // TODO il devrait tous avoir des commentaires à mon avis...
            return !_.isUndefined(state.caract_valider_echange) || [
                'init.saa.offrir.existant.form',
                'init.saa.recevoir.choix.nouveau.form',
            ].includes(state.id)
        }

        $scope.form_is_destinataire_du_service = function (state) {
            return [
                'init.saa.offrir.nouveau.cat.form',
                'init.saa.offrir.existant.form',
                'init.saa.recevoir.choix.nouveau.form',
                'init.va.non.offert.nouveau.cat.form',
                'init.va.non.offert.existant.form'
            ].includes(state.id)
        }

        $scope.form_is_destinataire_du_service_de_qui = function (state) {
            return [
                'init.va.non.recu.choix.nouveau.form',
            ].includes(state.id)
        }

        $scope.form_is_frais_import_list_without_modify = function (state) {
            return _.isUndefined(state.caract_valider_echange) &&
                !_.isUndefined(state.caract_echange_nouvel_existant) &&
                ["Nouvelle offre", "Nouvelle demande"].includes(state.caract_offre_demande_nouveau_existante);
        }


        // Dev tools
        $scope.dctFormIsCall = {
            form_is_nouveau_except_pos: $scope.form_is_nouveau_except_pos,
            form_is_nouveau: $scope.form_is_nouveau,
            form_is_offre_demande_service: $scope.form_is_offre_demande_service,
            form_is_service: $scope.form_is_service,
            form_is_nouvelle_offre: $scope.form_is_nouvelle_offre,
            form_is_nouvelle_demande: $scope.form_is_nouvelle_demande,
            form_is_service_to_modify: $scope.form_is_service_to_modify,
            form_is_service_and_service_prevu: $scope.form_is_service_and_service_prevu,
            form_is_nouvel_echange_service_offrir_offre_existante: $scope.form_is_nouvel_echange_service_offrir_offre_existante,
            form_is_valider_echange: $scope.form_is_valider_echange,
            form_is_echange_pas_valider: $scope.form_is_echange_pas_valider,
            form_is_recevoir_not_valider: $scope.form_is_recevoir_not_valider,
            form_is_exist_echange_to_validate: $scope.form_is_exist_echange_to_validate,
            form_is_echange_sur_offre_demande_existante: $scope.form_is_echange_sur_offre_demande_existante,
            form_is_frais_trajet_distance: $scope.form_is_frais_trajet_distance,
            form_is_frais_trajet_prix: $scope.form_is_frais_trajet_prix,
            form_is_commentaire: $scope.form_is_commentaire,
            form_is_destinataire_du_service: $scope.form_is_destinataire_du_service,
            form_is_destinataire_du_service_de_qui: $scope.form_is_destinataire_du_service_de_qui,
            form_is_frais_import_list_without_modify: $scope.form_is_frais_import_list_without_modify,
        }

        for (const [name, cb] of Object.entries($scope.dctFormIsCall)) {
            $scope.dctFormIsCall[name] = {
                enable: false,
                originCB: cb,
                cb: function (dctCB) {
                    let $scope_participer = angular.element(document.querySelector('[ng-controller="AideController"]')).scope();
                    for (const [name, innerCB] of Object.entries($scope.dctFormIsCall)) {
                        innerCB.enable = false;
                    }
                    dctCB.enable = true;

                    for (const state of $scope_participer.data.state) {
                        let result = cb(state);
                        state.table_col_check = result;
                    }
                }
            }
        }

        $scope.parseFloatTime = function (value) {
            let factor = 1;
            if (value[0] === '-') {
                value = value.slice(1);
                factor = -1;
            }
            let float_time_pair = value.split(":");
            if (float_time_pair.length !== 2)
                return factor * parseFloat(value);
            let hours = $scope.parseInteger(float_time_pair[0]);
            let minutes = $scope.parseInteger(float_time_pair[1]);
            return factor * (hours + (minutes / 60));
        }

        $scope.parseInteger = function (value) {
            let parsed = $scope.parseNumber(value);
            // do not accept not numbers or float values
            if (isNaN(parsed) || parsed % 1 || parsed < -2147483648 || parsed > 2147483647) {
                throw new Error(_.str.sprintf(core._t("'%s' is not a correct integer"), value));
            }
            return parsed;
        }

        $scope.parseNumber = function (value) {
            if (core._t.database.parameters.thousands_sep) {
                let escapedSep = _.str.escapeRegExp(core._t.database.parameters.thousands_sep);
                value = value.replace(new RegExp(escapedSep, 'g'), '');
            }
            if (core._t.database.parameters.decimal_point) {
                value = value.replace(core._t.database.parameters.decimal_point, '.');
            }
            return Number(value);
        }

        $scope.show_sum_total_time_echange = function () {
            let sum_total = 0;
            if (!_.isUndefined($scope.form.time_realisation_service)) {
                sum_total += $scope.parseFloatTime($scope.form.time_realisation_service);
            }
            if (!_.isUndefined($scope.form.time_dure_trajet)) {
                sum_total += $scope.parseFloatTime($scope.form.time_dure_trajet);
            }
            if (!_.isUndefined($scope.form.time_service_estimated)) {
                sum_total += $scope.parseFloatTime($scope.form.time_service_estimated);
            }
            if (!_.isUndefined($scope.form.time_drive_estimated)) {
                sum_total += $scope.parseFloatTime($scope.form.time_drive_estimated);
            }
            return $scope.convertNumToTime(sum_total, 8);
        }

        $scope.submit_form = function () {
            $scope.form.state_id = $scope.state.id;
            let copiedForm = JSON.parse(JSON.stringify($scope.form));
            // Transform all date
            // if (!_.isUndefined(copiedForm.time_service)) {
            //     copiedForm.time_service = $scope.parseFloatTime(copiedForm.time_service);
            // }
            if (!_.isUndefined(copiedForm.time_realisation_service)) {
                copiedForm.time_realisation_service = $scope.parseFloatTime(copiedForm.time_realisation_service);
            }
            if (!_.isUndefined(copiedForm.time_dure_trajet)) {
                copiedForm.time_dure_trajet = $scope.parseFloatTime(copiedForm.time_dure_trajet);
            }
            if (!_.isUndefined(copiedForm.time_service_estimated)) {
                copiedForm.time_service_estimated = $scope.parseFloatTime(copiedForm.time_service_estimated);
            }
            if (!_.isUndefined(copiedForm.time_drive_estimated)) {
                copiedForm.time_drive_estimated = $scope.parseFloatTime(copiedForm.time_drive_estimated);
            }

            // TODO this is a bug, need an appropriate form
            if (!_.isUndefined(copiedForm.time_service_estimated) && !_.isUndefined(copiedForm.time_realisation_service)) {
                copiedForm.time_service_estimated = $scope.parseFloatTime(copiedForm.time_realisation_service);
            }
            if (!_.isUndefined(copiedForm.time_drive_estimated) && !_.isUndefined(copiedForm.time_dure_trajet)) {
                copiedForm.time_drive_estimated = $scope.parseFloatTime(copiedForm.time_dure_trajet);
            }

            console.log(copiedForm);
            let url = "/accorderie/participer/form/submit"
            ajax.rpc(url, copiedForm).then(function (data) {
                    console.debug("AJAX receive submit_form");
                    console.debug(data);

                    if (data.error) {
                        $scope.error = data.error;
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty data - " + "/accorderie/participer/form/submit";
                    } else {
                        $scope.show_submit_modal = true;
                        // TODO when after server url redirection or create logic condition
                        if ($scope.form_is_nouvelle_offre($scope.state)) {
                            $scope.submitted_url = `accorderie_canada_ddb/accorderie_offre_service/${data.offre_service_id}`;
                        } else if ($scope.form_is_nouvelle_demande($scope.state)) {
                            $scope.submitted_url = `accorderie_canada_ddb/accorderie_demande_service/${data.demande_service_id}`;
                        } else if ($scope.form_is_service_and_service_prevu($scope.state)) {
                            $scope.submitted_url = `monactivite/echange#!?echange=${data.echange_service_id}`;
                        } else {
                            $scope.submitted_url = "";
                        }
                    }

                    // Process all the angularjs watchers
                    $scope.$digest();
                }
            )
        }

        $scope.reinit_state_model_field = function (state) {
            // Fill state model from parameters
            if (!_.isUndefined(state.model_field_name)) {
                // if (!_.isUndefined(state.model_field_name) && (!_.isUndefined(state.selected_id))) {
                let value;
                if (!_.isUndefined(state.model_field_name_alias)) {
                    value = $location.search()[state.model_field_name_alias];
                } else if (!_.isUndefined(state.model_field_name)) {
                    value = $location.search()[state.model_field_name];
                }
                if (jQuery.isNumeric(value)) {
                    value = parseInt(value);
                }
                if (!_.isUndefined(value)) {
                    if (!_.isUndefined(state.dct_data_inner)) {
                        let data = state.dct_data_inner[value];
                        if (_.isUndefined(data)) {
                            $scope.error = `Erreur avec la base de données 'data_inner' de  ${value}`;
                            console.error($scope.error);
                        } else {
                            $scope.form[state.model_field_name] = {"id": data.id, "value": data.title};
                            state.selected_id = data.id;
                            state.selected_value = data.title;
                        }
                    } else if (!_.isUndefined(state.dct_data)) {
                        let data = state.dct_data[value];
                        if (_.isUndefined(data)) {
                            $scope.error = `Erreur avec la base de données 'data' de ${value}`;
                            console.error($scope.error);
                        } else {
                            $scope.form[state.model_field_name] = {"id": data.id, "value": data.title};
                            state.selected_id = data.id;
                            state.selected_value = data.title;
                        }
                    } else {
                        if (state.model_field_name.endsWith("_id")) {
                            // TODO this is bad, need to update database to get value
                            $scope.form[state.model_field_name] = {"id": value};
                        } else {
                            $scope.form[state.model_field_name] = value;
                        }
                        console.warn("Model field name '" + state.model_field_name + "' got this value : " + value);
                        state.selected_value = value;
                    }
                }
            }
        }

        $scope.fill_model_form_from_state = function (state) {
            // Fill models form
            if (!_.isUndefined(state.model_field_name) && (!_.isUndefined(state.selected_id))) {
                $scope.form[state.model_field_name] = {
                    "id": state.selected_id,
                    "value": state.selected_value
                }
            }
        }

        $scope.is_show_submit = function () {
            return !$scope.error && $scope.state.type === "form";
        }

        // State
        $scope.is_show_previous = function () {
            return $scope.stack_breadcrumb_state.length > 1
        }

        $scope.is_show_next = function () {
            return !$scope.in_multiple_inner_state && !$scope.error && !["form", "null"].includes($scope.state.type);
        }

        $scope.is_disable_next = function () {
            // disable when not next_id, or when next_id but not selected_value from inner_state
            if (_.isEmpty($scope.workflow)) {
                return true;
            }
            if (_.isEmpty($scope.state.next_id)) {
                return true;
            }
            return !!($scope.is_next_wait_value && _.isEmpty($scope.state.selected_value));
        }

        $scope.change_state_name = function (stateName) {
            // console.debug("call change_state_name : " + stateName);
            let state = $scope.workflow[stateName];
            $scope.update_state(state, "change_state_name '" + stateName + "'");
        }

        $scope.change_state_index = function (idx) {
            // console.debug("Change state to index " + idx);
            let state = $scope.stack_breadcrumb_state.at(idx);
            $scope.update_state(state, "fct change_state_index stack_breadcrumb_state index '" + idx + "'");
        }

        $scope.next_btn = function () {
            console.debug($scope.form);
            if ($scope.is_disable_next()) return;
            // console.debug("call next_btn");
            if (_.isUndefined($scope.state.next_id) || _.isEmpty($scope.state.next_id)) {
                console.error("Cannot find next state, next_id variable is undefined or empty.");
                console.debug($scope.state);
            } else {
                // special case for date and time
                if ($scope.state.type === "calendrier" || $scope.state.type === "time" || $scope.state.type === "temps_duree") {
                    $scope.state.selected_value = $(`#${$scope.state.model_field_name}`).data().date;
                    $scope.form[$scope.state.model_field_name] = $scope.state.selected_value;
                }

                // Fill URL parameters
                if (!_.isUndefined($scope.state.model_field_name_alias) && (!_.isUndefined($scope.state.selected_id))) {
                    $location.search($scope.state.model_field_name_alias, $scope.state.selected_id);
                } else if (!_.isUndefined($scope.state.model_field_name) && (!_.isUndefined($scope.state.selected_id))) {
                    $location.search($scope.state.model_field_name, $scope.state.selected_id);
                } else if (!_.isUndefined($scope.state.model_field_name_alias) && (!_.isUndefined($scope.state.selected_value))) {
                    $location.search($scope.state.model_field_name_alias, $scope.state.selected_value);
                } else if (!_.isUndefined($scope.state.model_field_name) && (!_.isUndefined($scope.state.selected_value))) {
                    $location.search($scope.state.model_field_name, $scope.state.selected_value);
                }
                // TODO ordering function call is bad, not optimal... Need refactoring
                $scope.fill_model_form_from_state($scope.state);
                let state = $scope.workflow[$scope.state.next_id];
                $scope.update_state(state, "next_btn '" + $scope.state.next_id + "'");
            }
        }

        $scope.previous_btn = function () {
            // console.debug("call previous_btn");
            $scope.error = "";
            if (!_.isEmpty($scope.stack_breadcrumb_state)) {
                $scope.change_breadcrumb_index($scope.stack_breadcrumb_state.length - 1);
                // $scope.stack_breadcrumb_state.pop();
                // if (_.isEmpty($scope.stack_breadcrumb_state)) {
                //     // Force return to init
                //     $scope.change_state_name(INIT_STATE);
                // } else {
                //     $scope.change_state_index(-1);
                // }
            } else {
                // Not suppose to call here, internal bug
                console.error("Bug, the user can press previous button when the stack_breadcrumb_state is not empty.");
                $scope.change_state_name(INIT_STATE);
            }
        }

        $scope.state_get_data = function () {
            // console.debug("call state_get_data");
            if (!_.isEmpty($scope.stack_breadcrumb_inner_state)) {
                // Show data from inner workflow
                let option = $scope.stack_breadcrumb_inner_state.at(-1);
                // $scope.update_inner_state(option);
                return option.sub_list;
            } else {
                return $scope.state.data;
            }
        }

        $scope.update_data_url = function (state) {
            // return true if need to stop execution
            let status = false;
            // Update data if need it
            if (_.isString(state.data) || state.force_update_data) {
                // If data is string, data is not initialize
                if (_.isEmpty(state.data_update_url)) {
                    $scope.error = "Cannot update database, missing state variable 'data_update_url'";
                    console.error($scope.error);
                } else {
                    let new_url = state.data_update_url;
                    if (!_.isEmpty(state.data_url_field)) {
                        // Search all variable from $scope.form to create new url for request
                        let array_param = [];
                        let str_array = state.data_url_field.split(";");
                        for (let i = 0; i < str_array.length; i++) {
                            let form_value = $scope.form[str_array[i]];
                            if (_.isUndefined(form_value)) {
                                $scope.error = "Cannot find form value of '" + str_array[i] + "'";
                                console.error($scope.error);
                            } else {
                                if (_.isObject(form_value)) {
                                    array_param.push(form_value.id)
                                } else {
                                    array_param.push(form_value);
                                }
                            }
                        }
                        if (_.isEmpty($scope.error)) {
                            // Replace all %s by array value
                            new_url = _.str.vsprintf(new_url, array_param);
                        }
                    }
                    // Send request
                    if (_.isEmpty($scope.error)) {
                        status = true;
                        requestSpecialURL($scope, state, new_url);
                    }
                }
            }
            return status;
        }

        $scope.update_state = function (state, debugFromInfo) {
            if (_.isUndefined(state)) {
                $scope.error = "Cannot find state from " + debugFromInfo;
                console.error($scope.error);
            } else {
                let status = $scope.update_data_url(state);
                if (!status) {
                    $scope._update_state(state);
                }
            }
        }

        $scope._update_state = function (state) {
            console.debug("call update_state");
            console.debug(state);
            $scope.error = "";
            // Update URL parameters
            if (state.id === INIT_STATE) {
                console.debug("Change URL " + PARAM_STATE_NAME + " to init.");
                $location.search(PARAM_STATE_NAME, null);
            } else {
                console.debug("Change URL " + PARAM_STATE_NAME + " to value " + state.id);
                $location.search(PARAM_STATE_NAME, state.id);
            }
            // Fill models form
            $scope.fill_model_form_from_state(state);
            if (!_.isUndefined($scope.autoCompleteJS)) {
                // Clean autoCompleteJS when change state
                try {
                    $scope.autoCompleteJS.unInit();
                } catch (e) {
                    // ignore, unInit already called
                }
                $scope.autoCompleteJS = undefined;
            }
            $scope.state = state;
            $scope.stack_breadcrumb_state.push(state);
            $scope.update_breadcrumb();
            $scope.in_multiple_inner_state = state.type === "choix_categorie_de_service" && !_.isUndefined(state.data);
            $scope.is_inner_state = state.type === "choix_categorie_de_service";
            $scope.is_next_wait_value = $scope.is_inner_state || state.type === "choix_membre"
            // Force delete stack inner state
            $scope.stack_breadcrumb_inner_state = [];
            $scope.actual_inner_state_name = "";

            // Start animation when detect it
            if (!_.isEmpty($location.search().animation)) {
                console.debug("LOADING init start animation '" + $location.search().animation + "'");
                $scope.$parent.animationRecord.enable = true;
                $scope.$parent.animationRecord.animationName = $location.search().animation;
                $scope.$parent.animationRecord.stateAnimation = 1;
                $scope.$parent.$apply();
            }
        }

        // Dynamique list
        $scope.click_statique = function (option) {
            console.debug("call click_statique");
            console.debug(option);

            $scope.state.next_id = option.id;

            // clean dynamique option
            $scope.state.selected_id = undefined;
            $scope.state.selected_obj_value = undefined;
            $scope.state.selected_value = undefined;

            // This is change by ng-model
            // $scope.state.next_id = $scope.state.next_id_data;
        }

        $scope.click_dynamique = function (option) {
            console.debug("call click_dynamique");
            console.debug(option);
            $scope.state.selected_id = option.id;
            $scope.state.selected_obj_value = option;
            $scope.state.selected_value = option.id;
            $scope.state.next_id = $scope.state.next_id_data;
        }

        // Inner state, temporary internal state
        $scope.click_inner_state_option = function (option) {
            console.debug("call click_inner_state_option");
            console.debug(option);
            if ($scope.is_inner_state) {
                if ($scope.in_multiple_inner_state) {
                    $scope.stack_breadcrumb_inner_state.push(option);
                    $scope.actual_inner_state_name = option.title;
                    $scope.update_inner_state(option);
                } else {
                    $scope.state.selected_value = option.title;
                    $scope.state.selected_id = option.id;
                    $scope.state.selected_tree_id = option.tree_id;
                }
            }
        }

        $scope.is_not_implemented = function (option) {
            return !Object.keys($scope.workflow).includes(option.id);
        }

        $scope.previous_inner_state_btn = function () {
            // console.debug("call previous_inner_state_btn");
            $scope.error = "";
            $scope.actual_inner_state_name = "";
            if (!_.isEmpty($scope.stack_breadcrumb_inner_state)) {
                $scope.stack_breadcrumb_inner_state.pop();
                if (!_.isEmpty($scope.stack_breadcrumb_inner_state)) {
                    let option = $scope.stack_breadcrumb_inner_state.at(-1);
                    if (!_.isUndefined(option)) {
                        $scope.actual_inner_state_name = option.title;
                        $scope.update_inner_state(option);
                    }
                }
            } else {
                console.error("Cannot previous inner state.");
            }
        }

        $scope.update_inner_state = function (option) {
            // console.debug("call update_inner_state");
            // validate if inner workflow continue, check if contains sub_list
            $scope.in_multiple_inner_state = !_.isUndefined(option.sub_list) && !_.isUndefined(option.sub_list.at(-1).sub_list);
        }

        // Breadcrumb
        $scope.change_breadcrumb_index = function (idx) {
            // console.debug("Change state to index " + idx);
            if (idx === 0) {
                // TODO maybe not, need to delete some variable
                $scope.init_controller();
            } else {
                let reverse_index = $scope.stack_breadcrumb_state.length - idx;
                for (let i = 0; i < reverse_index; i++) {
                    // Remove variable from inner state
                    let state = $scope.stack_breadcrumb_state.pop();
                    // if (!_.isUndefined(state.selected_id)) {
                    //     state.selected_id = undefined;
                    //     state.selected_value = undefined;
                    // }
                    // Remove parameters
                    if (!_.isUndefined(state.model_field_name_alias)) {
                        $location.search(state.model_field_name_alias, null);
                    } else if (!_.isUndefined(state.model_field_name)) {
                        $location.search(state.model_field_name, null);
                    }
                    // Remove form model
                    if (!_.isUndefined(state.model_field_name) && $scope.form.hasOwnProperty(state.model_field_name)) {
                        delete $scope.form[state.model_field_name];
                    }
                }
                // Remove variable from actual state
                // let state = $scope.stack_breadcrumb_state.at(-1);
                // if (!_.isUndefined(state) && !_.isUndefined(state.selected_id)) {
                //         state.selected_id = undefined;
                //         state.selected_value = undefined;
                //     }
                // - 1 to reverse 1 step
                $scope.change_state_index(idx - 1);
            }
        }

        $scope.update_breadcrumb = function () {
            console.debug("call update_breadcrumb");
            let lst_label = [];
            let global_label = "";
            for (let i = 0; i < $scope.stack_breadcrumb_state.length; i++) {
                let state = $scope.stack_breadcrumb_state[i];
                let lastState = $scope.stack_breadcrumb_state[i - 1];
                if (!_.isUndefined(state.breadcrumb_value) && !_.isEmpty(state.breadcrumb_value)) {
                    let lst_breadcrumb = state.breadcrumb_value.split(".");
                    let label = "";
                    let html_label = "";
                    for (let j = 0; j < lst_breadcrumb.length; j++) {
                        if (!$scope.state.breadcrumb_show_only_last_item && (!_.isEmpty(global_label) || !_.isEmpty(label))) {
                            label += " > "
                            html_label += " <i class='fa fa-chevron-right'/> "
                        }
                        let str_bread = lst_breadcrumb[j];
                        // Dynamique update string
                        if (!_.isEmpty(state.breadcrumb_field_value)) {
                            let array_param = [];
                            let str_array = state.breadcrumb_field_value.split(";");
                            for (let i = 0; i < str_array.length; i++) {
                                let form_value = $scope.form[str_array[i]];
                                if (_.isUndefined(form_value)) {
                                    $scope.error = "Cannot find form value of '" + str_array[i] + "'";
                                    console.error($scope.error);
                                } else {
                                    if (_.isObject(form_value)) {
                                        array_param.push(form_value.value)
                                    } else {
                                        array_param.push(form_value);
                                    }
                                }
                            }
                            if (_.isEmpty($scope.error)) {
                                // Replace all %s by array value
                                str_bread = _.str.vsprintf(str_bread, array_param);
                            }
                        }

                        label += str_bread;
                        html_label += str_bread;
                    }
                    global_label += label;
                    lst_label.push({"index": i, "text": label, "html": html_label})
                } else if (state.breadcrumb_show_only_last_item && !_.isUndefined(lastState) && !_.isUndefined(lastState.selected_value) && !_.isEmpty(lastState.selected_value)) {
                    let label = lastState.selected_value;
                    global_label += label;
                    lst_label.push({"index": i, "text": label, "html": label})
                }
            }
            // Special decoration
            if (!$scope.state.breadcrumb_show_only_last_item && !_.isEmpty(lst_label) && global_label.indexOf(" > ") === -1) {
                lst_label.at(-1).text += " > ..."
            }
            if ($scope.state.breadcrumb_show_only_last_item) {
                $scope.lst_label_breadcrumb = [lst_label.at(-1)];
            } else {
                $scope.lst_label_breadcrumb = lst_label;
            }
        }
    }
    ])

    let ParticiperForm = Widget.extend({
        start: function () {
        },
    });

    return ParticiperForm;
});