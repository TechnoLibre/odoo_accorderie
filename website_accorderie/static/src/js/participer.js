odoo.define('website.accorderie.participer.instance', function (require) {
    'use strict';

    require('web_editor.ready');
    let ParticiperForm = require('website.accorderie.participer');

    let $form = $('#participer_form');
    if (_.isEmpty($form)) {
        return null;
    }

    let instance = new ParticiperForm();
    return instance.appendTo($form).then(function () {
        return instance;
    });
});

odoo.define("website.accorderie.date_and_time", function (require) {
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

odoo.define("website.accorderie.participer", function (require) {
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

    let app = angular.module('AccorderieApp', []);

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
                ajax.rpc("/accorderie/get_info/get_offre_service/" + $scope.service_id).then(function (data) {
                    console.debug("AJAX receive /accorderie/get_info/get_offre_service");
                    if (data.error || !_.isUndefined(data.error)) {
                        $scope.error = data.error;
                        console.error($scope.error);
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty '/accorderie/get_info/get_offre_service' data";
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
                ajax.rpc("/accorderie/get_info/get_demande_service/" + $scope.service_id).then(function (data) {
                    console.debug("AJAX receive /accorderie/get_info/get_demande_service");
                    if (data.error || !_.isUndefined(data.error)) {
                        $scope.error = data.error;
                        console.error($scope.error);
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty '/accorderie/get_info/get_demande_service' data";
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
                ajax.rpc("/accorderie/get_info/get_echange_service/" + $scope.echange_service_id).then(function (data) {
                    console.debug("AJAX receive /accorderie/get_info/get_echange_service");
                    if (data.error || !_.isUndefined(data.error)) {
                        $scope.error = data.error;
                        console.error($scope.error);
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty '/accorderie/get_info/get_echange_service' data";
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
        $scope.form_date_service = "";
        $scope.form_time_service = "";
        $scope.form_copy_date_service = "";
        $scope.form_copy_time_service = "";
        $scope.form_is_modifying_date_service = false;
        $scope.form_is_modifying_time_service = false;
        $scope.tmpForm = {
            modelChooseMember: "",
        };
        $scope.show_submit_modal = false;
        $scope.submitted_url = "";

        // Add animation
        let $scope_animation = angular.element(document.querySelector('[ng-controller="AnimationController"]')).scope();
        $scope_animation.animationRecord.lstAnimation.push("Créer une offre de service publique individuelle");
        $scope_animation.animationRecord.lstAnimation.push("Créer une demande de service publique individuelle");
        $scope_animation.animationRecord.lstAnimation.push("Créer un échange en tant que personne offrant le service avec une offre existante");
        $scope_animation.animationRecord.lstAnimation.push("Créer un échange en tant que personne recevant le service d’une offre existante");
        $scope_animation.animationRecord.lstAnimation.push("Créer un échange en tant que personne offrant le service avec une offre qui doit être créée");
        $scope_animation.animationRecord.lstAnimation.push("Créer un échange en tant que personne recevant le service d’une demande qui doit être créée");
        $scope_animation.animationRecord.lstAnimation.push("Valider un échange existant");
        $scope_animation.animationRecord.lstAnimation.push("Valider un échange inexistant lorsqu’on est la personne qui a offert le service sur une offre créée");
        $scope_animation.animationRecord.lstAnimation.push("Valider un échange inexistant lorsqu’on est la personne qui a demandé le service sur une offre créée");
        $scope_animation.animationRecord.lstAnimation.push("Valider un échange inexistant lorsqu’on est la personne qui a offert le service sur une offre qui doit être créée");
        $scope_animation.animationRecord.lstAnimation.push("Valider un échange inexistant lorsqu’on est la personne qui a demandé le service sur une demande qui doit être créée");

        $scope.$watch('form.date_service', function (newValue, oldValue) {
            if (!_.isUndefined(newValue)) {
                $scope.form_date_service = moment(newValue).format('dddd D MMMM YYYY');
            }
        })

        $scope.toggleFormIsModifyingDateService = function (cancel) {
            if (!_.isUndefined(cancel)) {
                $scope.form.date_service = $scope.form_copy_date_service;
            } else if (!$scope.form_is_modifying_date_service) {
                $scope.form_copy_date_service = $scope.form.date_service;
            }
            $scope.form_is_modifying_date_service = !$scope.form_is_modifying_date_service;
        }

        $scope.$watch('form.time_service', function (newValue, oldValue) {
            if (!_.isUndefined(newValue)) {
                $scope.form_time_service = moment(newValue, "HH:mm").format('HH[h]mm');
            }
        })

        $scope.toggleFormIsModifyingTimeService = function (cancel) {
            if (!_.isUndefined(cancel)) {
                $scope.form.time_service = $scope.form_copy_time_service;
            } else if (!$scope.form_is_modifying_time_service) {
                $scope.form_copy_time_service = $scope.form.time_service;
            }
            $scope.form_is_modifying_time_service = !$scope.form_is_modifying_time_service;
        }

        $scope.formCanSend = function () {
            return !($scope.form_is_modifying_date_service || $scope.form_is_modifying_time_service)
        }

        let url = "/accorderie/get_participer_workflow_data/";
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
            if (window.location.pathname !== "/participer") {
                return;
            }
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

        $scope.form_is_demande_existante = function (state) {
            return state.caract_offre_demande_nouveau_existante === "Demande existante";
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

        // $scope.form_is_offre_existante = function (state) {
        //     return state.caract_offre_demande_nouveau_existante === "Offre existante";
        // }

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

            // Transform date local to UTC
            let date_service;
            if (!_.isUndefined(copiedForm.date_service)) {
                date_service = copiedForm.date_service;
            }
            if (!_.isUndefined(date_service)) {
                // Don't transform if missing time, because the date will be the same
                if (!_.isUndefined(copiedForm.time_service)) {
                    date_service += " " + copiedForm.time_service;
                }
                let utc_date_service = moment(date_service).utc();
                copiedForm.date_service = utc_date_service.format("YYYY-MM-DD");
                copiedForm.time_service = utc_date_service.format("HH:mm");
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
                            $scope.submitted_url = `accorderie/accorderie_offre_service/${data.offre_service_id}`;
                        } else if ($scope.form_is_nouvelle_demande($scope.state)) {
                            $scope.submitted_url = `accorderie/accorderie_demande_service/${data.demande_service_id}`;
                        } else if ($scope.form_is_service_and_service_prevu($scope.state)) {
                            $scope.submitted_url = `monactivite/echange${$scope.$parent.url_debug}#!?echange=${data.echange_service_id}`;
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
                let $scope_animation = angular.element(document.querySelector('[ng-controller="AnimationController"]')).scope();
                $scope_animation.animationRecord.enable = true;
                $scope_animation.animationRecord.animationName = $location.search().animation;
                $scope_animation.animationRecord.stateAnimation = 1;
                $scope_animation.$apply();
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
            return !Object.keys($scope.workflow).includes(option.id) || option.not_implemented;
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