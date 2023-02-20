odoo.define('website.accorderie_angularjs_global', function (require) {
    "use strict";

    require('web.dom_ready');
    let ajax = require('web.ajax');
    let core = require('web.core');
    let session = require('web.session');
    let Widget = require('web.Widget');
    let QWeb = core.qweb;
    let _t = core._t;

    if (window.location.pathname === "/web/signup") {
        console.info("Disable AngularJS, this block signup form.")
        document.getElementById("wrapwrap").removeAttribute("ng-app");
        document.getElementById("wrapwrap").removeAttribute("ng-controller");
        return;
    }

    // Get existing module
    let app = angular.module('AccorderieApp');

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
            nb_echange_a_venir: 0,
            nb_echange_en_cours: 0,
            nb_echange_passe: 0,
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
        $scope.animation_controller_enable = false;

        // TODO créer environnement modification
        $scope.ask_modification = false;
        $scope.ask_modification_profile = false;
        $scope.updateImage = function (input) {
            var reader = new FileReader();
            reader.onload = function () {
                $scope.$apply(function () {
                    // $scope.imageSrc = reader.result;
                    $scope.membre_info.ma_photo = reader.result;
                });
            };
            reader.readAsDataURL(input.files[0]);
        };
        $scope.change_ask_modification_profile = function (enable) {
            $scope.ask_modification_profile = enable;
        };
        $scope.click_file_input = function () {
            // $scope.ask_modification_profile = enable;
            console.debug("prout)");
            $('#file-input').click();
        };


        $scope.lst_notification = [];

        $scope.notif_filter_unread = function (notif) {
            return !_.isUndefined(notif.is_read) && !notif.is_read;
        }

        $scope.toggle_animation_record_show = function () {
            $scope.animation_controller_enable = !$scope.animation_controller_enable;
            let $scope_animation = angular.element(document.querySelector('[ng-controller="AnimationController"]')).scope();
            $scope_animation.animationRecord.enable = $scope.animation_controller_enable;
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

        $scope.supprimer_offre_service = function (offre_id) {
            ajax.rpc(`/accorderie/submit/offre/supprimer/${offre_id}`).then(function (data) {
                console.debug("AJAX receive supprimer_offre_service");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                    // } else if (_.isEmpty(data)) {
                    //     $scope.error = "Empty 'add_to_my_favorite' data";
                    //     console.error($scope.error);
                } else {
                    // Change location because it's deleted
                    location.replace("/monprofil/mesannonces");
                }

                // Process all the angularjs watchers
                // $scope.$digest();
            })
        }

        $scope.supprimer_demande_service = function (demande_id) {
            ajax.rpc(`/accorderie/submit/demande/supprimer/${demande_id}`).then(function (data) {
                console.debug("AJAX receive supprimer_demande_service");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                    // } else if (_.isEmpty(data)) {
                    //     $scope.error = "Empty 'add_to_my_favorite' data";
                    //     console.error($scope.error);
                } else {
                    // Change location because it's deleted
                    location.replace("/monprofil/mesannonces");
                }

                // Process all the angularjs watchers
                // $scope.$digest();
            })
        }

        $scope.change_publication_offre_service = function (offre_id, website_published) {
            ajax.rpc(`/accorderie/submit/offre/publish/${offre_id}`, {"website_published": website_published}).then(function (data) {
                console.debug("AJAX receive change_publication_offre_service");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                    // } else if (_.isEmpty(data)) {
                    //     $scope.error = "Empty 'add_to_my_favorite' data";
                    //     console.error($scope.error);
                }

                // Process all the angularjs watchers
                // $scope.$digest();
            })
        }

        $scope.change_publication_demande_service = function (demande_id, website_published) {
            ajax.rpc(`/accorderie/submit/demande/publish/${demande_id}`, {"website_published": website_published}).then(function (data) {
                console.debug("AJAX receive change_publication_demande_service");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                    // } else if (_.isEmpty(data)) {
                    //     $scope.error = "Empty 'add_to_my_favorite' data";
                    //     console.error($scope.error);
                }

                // Process all the angularjs watchers
                // $scope.$digest();
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
                    options.defaultDate = moment("08:00", "HH:mm");
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
            let input = $('#date_echange_id');
            let date_value = input.data().date;
            if (date_value.includes("/")) {
                // Bug, wrong format (why, load_date is called with specific format...), force it
                console.warn("Bug wrong format date, got '" + date_value + "' and expect format YYYY-MM-DD, force conversion.")
                date_value = moment(date_value).format("YYYY-MM-DD");
            }
            let membre_id = $scope.demande_service_info.membre_id;
            let demande_id = $scope.demande_service_info.id;
            let url = `/participer#!?state=init.saa.offrir.demande.existante.date.time.form&membre=${membre_id}&demande_service=${demande_id}&date=${date_value}`;
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
            let qrcode_dom = document.getElementById("qrcode");
            // Force clean old QR Code
            qrcode_dom.innerHTML = "";
            new QRCode(qrcode_dom, urlToCopy);
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
            ajax.rpc("/accorderie/get_personal_information", {}).then(function (data) {
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
                    $scope.lst_notification = data.lst_notification;

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
            ajax.rpc("/accorderie/get_membre_information/" + membre_id).then(function (data) {
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
            ajax.rpc("/accorderie/get_info/nb_offre_service", {}).then(function (data) {
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
            let key = "/accorderie/accorderie_offre_service/";
            if (window.location.pathname.indexOf(key) === 0) {
                // params can be 6?debug=1 or 6#!?str=3, need to extract first int
                let params = window.location.pathname.substring(key.length);
                params = parseInt(params, 10);
                if (!Number.isNaN(params)) {
                    ajax.rpc("/accorderie/get_info/get_offre_service/" + params).then(function (data) {
                        console.debug("AJAX receive /accorderie/get_info/get_offre_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie/get_info/get_offre_service' data";
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
            // Remove optimisation, need it for "my favorite"
            // key = "/offresservice";
            // if (window.location.pathname.indexOf(key) === 0) {
            ajax.rpc("/accorderie/get_info/all_offre_service").then(function (data) {
                console.debug("AJAX receive /accorderie/get_info/all_offre_service");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty '/accorderie/get_info/all_offre_service' data";
                    console.error($scope.error);
                } else {
                    $scope.dct_offre_service_info = data;
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
            // }
            // key = "/demandesservice";
            // if (window.location.pathname.indexOf(key) === 0) {
            ajax.rpc("/accorderie/get_info/all_demande_service").then(function (data) {
                console.debug("AJAX receive /accorderie/get_info/all_demande_service");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty '/accorderie/get_info/all_demande_service' data";
                    console.error($scope.error);
                } else {
                    $scope.dct_demande_service_info = data;
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
            // }
            key = "/accorderie/accorderie_demande_service/";
            if (window.location.pathname.indexOf(key) === 0) {
                // params can be 6?debug=1 or 6#!?str=3, need to extract first int
                let params = window.location.pathname.substring(key.length);
                params = parseInt(params, 10);
                if (!Number.isNaN(params)) {
                    ajax.rpc("/accorderie/get_info/get_demande_service/" + params).then(function (data) {
                        console.debug("AJAX receive /accorderie/get_info/get_demande_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie/get_info/get_demande_service' data";
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
                    ajax.rpc("/accorderie/get_info/get_echange_service/" + echange_id).then(function (data) {
                        console.debug("AJAX receive /accorderie/get_info/get_echange_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie/get_info/get_echange_service' data";
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

        // $scope.closeModalForm = function () {
        //     console.debug("close");
        //     $scope.show_submit_modal = false;
        //     let modal = document.getElementsByClassName("modal_pub_offre");
        //     if (!_.isUndefined(modal) && !_.isEmpty(modal)) {
        //         modal[0].classList.remove("show");
        //     }
        // }

        $scope.load_page_offre_demande_echange_service();

        $scope.update_db_list_membre = function (accorderie_id) {
            ajax.rpc("/accorderie/get_info/list_membre", {"accorderie_id": accorderie_id}).then(function (data) {
                console.debug("AJAX receive /accorderie/get_info/list_membre");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty '/accorderie/get_info/list_membre' data";
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
                // Ignore sign when number === 0
                let plusSign = number !== 0. ? '+' : '';
                sign = sign === 1 ? plusSign : '-';
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
            // + 15h30 // format 7
            let time_bank = $scope.personal.actual_bank_hours;
            $scope.personal.actual_bank_sign = (time_bank >= 0);
            $scope.personal.actual_bank_time_diff = $scope.convertNumToTime(time_bank, 2);
            $scope.personal.actual_bank_time_human_short = $scope.convertNumToTime(time_bank, 3);
            $scope.personal.actual_bank_time_human = $scope.convertNumToTime(time_bank, 5);
            $scope.personal.actual_bank_time_human_simplify = $scope.convertNumToTime(time_bank, 6);

            $scope.personal.actual_month_bank_time_human_short = $scope.convertNumToTime($scope.personal.actual_month_bank_hours, 4);

            $scope.personal.nb_echange_en_cours = Object.values($scope.personal.dct_echange).filter(ex => !ex.transaction_valide && moment().isAfter(ex.date) && moment().isBefore(ex.end_date)).length;
            $scope.personal.nb_echange_a_venir = Object.values($scope.personal.dct_echange).filter(ex => !ex.transaction_valide && moment().isBefore(ex.date)).length
            $scope.personal.nb_echange_passe = Object.values($scope.personal.dct_echange).filter(ex => !ex.transaction_valide && moment().isAfter(ex.date)).length

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

    let AccorderieAngularJSGlobal = Widget.extend({
        start: function () {
        },
    });

    return AccorderieAngularJSGlobal;

});
