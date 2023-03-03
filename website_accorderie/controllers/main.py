import datetime as dt
import logging
import urllib.parse
from datetime import datetime, timedelta

import humanize
import pytz
import requests

from odoo import _, fields, http
from odoo.http import request
from odoo.tools.image import image_data_uri

_logger = logging.getLogger(__name__)
OSRM_URL = ""


def get_latitude_longitude(str_address):
    if not str_address:
        return "", ""
    nominatim_url = f"https://nominatim.openstreetmap.org/search/?q={urllib.parse.quote(str_address)}&limit=5&format=jsonv2&addressdetails=1&countrycodes=ca"
    try:
        r = requests.get(nominatim_url)
    except Exception:
        r = None
    if r and r.status_code == 200:
        lst_res = r.json()
        if lst_res:
            dct_res = lst_res[0]
            return dct_res["lat"], dct_res["lon"]
    return "", ""


def get_distance_osrm(lon1, lat1, lon2, lat2):
    distance = ""
    if not lon1 or not lon2 or not lat1 or not lat2:
        return distance
    i_distance = -1
    osrm_url = f"{OSRM_URL}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?alternatives=true"
    try:
        r = requests.get(osrm_url)
    except Exception:
        r = None
    if r and r.status_code == 200:
        dct_res = r.json()
        if dct_res and dct_res.get("code") == "Ok":
            lst_routes = dct_res["routes"]
            if lst_routes:
                i_distance = lst_routes[0]["distance"]
    if i_distance > -1:
        # Transform it
        if i_distance > 1000.0:
            distance = f"{i_distance / 1000.:.3f} km"
        else:
            distance = f"{i_distance} m"
    return distance


def find_distance_from_user(env, str_address):
    distance = ""
    if not env.user or not env.user.active or not OSRM_URL or not str_address:
        # TODO Propose to open gps
        return ""
    accorderie_membre_cls = env["accorderie.membre"]
    membre_id = accorderie_membre_cls.search([("user_id", "=", env.user.id)])
    if not membre_id:
        return ""
    if not membre_id.adresse:
        return "<font color='#FF0000'>Adresse non configuré</font>"
    lat2, lon2 = get_latitude_longitude(str_address)
    if lon2 and lat2:
        lat1, lon1 = get_latitude_longitude(membre_id.adresse)
        if lat1 and lon1:
            distance = get_distance_osrm(lon1, lat1, lon2, lat2)
        else:
            return "<font color='#FF0000'>Adresse non configuré</font>"

    return distance


class AccorderieController(http.Controller):
    @http.route(
        ["/accorderie/accorderie_offre_service/<int:offre_service>"],
        type="http",
        auth="user",
        website=True,
    )
    def get_page_offre_service(self, offre_service=None, **kw):
        env = request.env(context=dict(request.env.context))
        str_distance = "? km"

        str_diff_time = "Temps indéterminé"
        accorderie_offre_service_cls = env["accorderie.offre.service"]
        if offre_service:
            accorderie_offre_service_id = (
                accorderie_offre_service_cls.sudo()
                .browse(offre_service)
                .exists()
            )
            str_diff_time = self._transform_str_diff_time_creation(
                accorderie_offre_service_id.create_date
            )

            if (
                accorderie_offre_service_id
                and accorderie_offre_service_id.membre
            ):
                str_distance = find_distance_from_user(
                    env, accorderie_offre_service_id.membre.adresse
                )
        else:
            accorderie_offre_service_id = None

        dct_value = {
            "accorderie_offre_service_id": accorderie_offre_service_id,
            "str_diff_time": str_diff_time,
            "str_distance": str_distance,
        }

        # Render page
        return request.render(
            "website_accorderie.accorderie_offre_service_unit_liste_offre_et_demande_service",
            dct_value,
        )

    @http.route(
        [
            "/accorderie/get_info/get_offre_service/<model('accorderie.offre.service'):offre_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_info_offre_service(self, offre_id, **kw):
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        return {
            "id": offre_id.id,
            "description": offre_id.description,
            "titre": offre_id.titre,
            "website_published": offre_id.website_published,
            "is_favorite": me_membre_id.id in offre_id.membre_favoris_ids.ids,
            "distance": "8m",
            "membre_id": offre_id.membre.id,
            "membre": {
                "id": offre_id.membre.id,
                "full_name": offre_id.membre.nom,
            },
            "diff_create_date": self._transform_str_diff_time_creation(
                offre_id.create_date
            ),
        }

    @http.route(
        [
            "/accorderie/get_info/all_offre_service",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_all_offre_service(self, **kw):
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        # don't return not website_published if not same member
        value = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "website_published": a.website_published,
                "is_favorite": me_membre_id.id in a.membre_favoris_ids.ids,
                "distance": "8m",
                "membre_id": a.membre.id,
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom,
                },
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
            }
            for a in http.request.env["accorderie.offre.service"].search([])
            if a.membre.id == me_membre_id.id or a.website_published
        }
        return value

    @http.route(
        [
            "/accorderie/get_info/all_demande_service",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_all_demande_service(self, **kw):
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        # don't return not website_published if not same member
        value = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "is_favorite": me_membre_id.id in a.membre_favoris_ids.ids,
                "distance": "8m",
                "membre_id": a.membre.id,
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom,
                },
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
            }
            for a in http.request.env["accorderie.demande.service"].search([])
            if a.membre.id == me_membre_id.id or a.website_published
        }
        return value

    @http.route(
        [
            "/accorderie/get_info/get_demande_service/<model('accorderie.demande.service'):demande_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_info_demande_service(self, demande_id, **kw):
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        return {
            "id": demande_id.id,
            "description": demande_id.description,
            "titre": demande_id.titre,
            "website_published": demande_id.website_published,
            "is_favorite": me_membre_id.id
            in demande_id.membre_favoris_ids.ids,
            "distance": "8m",
            "membre_id": demande_id.membre.id,
            "membre": {
                "id": demande_id.membre.id,
                "full_name": demande_id.membre.nom,
            },
            "diff_create_date": self._transform_str_diff_time_creation(
                demande_id.create_date
            ),
        }

    @http.route(
        [
            "/accorderie/get_info/get_echange_service/<model('accorderie.echange.service'):echange_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_info_echange_service(self, echange_id, **kw):
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        if (
            me_membre_id.id not in echange_id.membre_vendeur.ids
            and me_membre_id.id not in echange_id.membre_acheteur.ids
        ):
            return {
                "error": (
                    "Ne peut pas accéder aux données d'un échange si vous êtes"
                    " ni l'offrant ou le receveur du service."
                )
            }

        # Update notification
        notif_ids = request.env[
            "accorderie.echange.service.notification"
        ].search(
            [
                ("membre_id", "=", me_membre_id.id),
                ("echange_service_id", "=", echange_id.id),
            ]
        )
        for notif in notif_ids:
            notif.is_read = True

        data = {
            "id": echange_id.id,
            "transaction_valide": echange_id.transaction_valide,
            "sujet_offre_service": echange_id.offre_service.titre,
            "description_offre_service": echange_id.offre_service.description,
            "categorie_offre_service": echange_id.offre_service.type_service_id.nom_complet,
            "has_offre_service": bool(echange_id.offre_service),
            "sujet_demande_service": echange_id.demande_service.titre,
            "description_demande_service": echange_id.demande_service.description,
            "categorie_demande_service": echange_id.demande_service.type_service_id.nom_complet,
            "has_demande_service": bool(echange_id.demande_service),
            "date": self.datetime_to_local(echange_id.date_echange),
            "duree_estime": echange_id.nb_heure_estime,
            "duree": echange_id.nb_heure,
            "duree_trajet_estime": echange_id.nb_heure_estime_duree_trajet,
            "duree_trajet": echange_id.nb_heure_duree_trajet,
            "frais_trajet": echange_id.frais_trajet,
            "distance_trajet": echange_id.distance_trajet,
            "frais_materiel": echange_id.frais_materiel,
            "commentaire": echange_id.commentaire,
        }

        if echange_id.date_echange:
            data["temps"] = (
                echange_id.date_echange.hour
                + echange_id.date_echange.minute / 60.0
            )

        if me_membre_id.id in echange_id.membre_vendeur.ids:
            membre = echange_id.membre_acheteur
            data["estAcheteur"] = False
        else:
            membre = echange_id.membre_vendeur
            data["estAcheteur"] = True

        data["membre"] = {
            "id": membre.id,
            "full_name": membre.nom,
        }
        data["membre_id"] = membre.id

        if echange_id.date_echange:
            if echange_id.transaction_valide:
                end_date = echange_id.date_echange + dt.timedelta(
                    hours=echange_id.nb_heure
                )
            else:
                end_date = echange_id.date_echange + dt.timedelta(
                    hours=echange_id.nb_heure_estime
                )
            data["end_date"] = self.datetime_to_local(end_date)

        if echange_id.offre_service:
            data["offre_service"] = echange_id.offre_service.id
        if echange_id.demande_service:
            data["demande_service"] = echange_id.demande_service.id
        return data

    @http.route(
        ["/accorderie/accorderie_demande_service/<int:demande_service>"],
        type="http",
        auth="user",
        website=True,
    )
    def get_page_demande_service(self, demande_service=None, **kw):
        env = request.env(context=dict(request.env.context))

        accorderie_demande_service_cls = env["accorderie.demande.service"]
        dct_value = {}
        if demande_service:
            accorderie_demande_service_id = (
                accorderie_demande_service_cls.sudo()
                .browse(demande_service)
                .exists()
            )
            dct_value[
                "accorderie_demande_service_id"
            ] = accorderie_demande_service_id
            str_diff_time = self._transform_str_diff_time_creation(
                accorderie_demande_service_id.create_date
            )
            dct_value["str_diff_time"] = str_diff_time
            if (
                accorderie_demande_service_id
                and accorderie_demande_service_id.membre
            ):
                str_distance = find_distance_from_user(
                    env, accorderie_demande_service_id.membre.adresse
                )
                dct_value["str_distance"] = str_distance

        # Render page
        return request.render(
            "website_accorderie.accorderie_demande_service_unit_liste_offre_et_demande_service",
            dct_value,
        )

    @http.route(
        [
            "/accorderie/offre_service_accorderie_offre_service_and_demande_service_accorderie_demande_service_list"
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_offre_service_accorderie_offre_service_and_demande_service_accorderie_demande_service_list(
        self, **kw
    ):
        env = request.env(context=dict(request.env.context))

        accorderie_offre_service_cls = env["accorderie.offre.service"]
        # TODO use write_date instead of create_date ?
        accorderie_offre_service_ids = (
            accorderie_offre_service_cls.sudo()
            .search(
                [("website_published", "=", True)],
                order="create_date desc",
                limit=3,
            )
            .ids
        )
        offre_services = accorderie_offre_service_cls.sudo().browse(
            accorderie_offre_service_ids
        )
        offre_services_count = (
            accorderie_offre_service_cls.sudo().search_count(
                [("website_published", "=", True)]
            )
        )
        lst_icon_offre_service = []
        lst_distance_offre_service = []
        for offre in offre_services:
            icon = None
            if (
                offre.type_service_id
                and offre.type_service_id.sous_categorie_id
                and offre.type_service_id.sous_categorie_id.categorie
                and offre.type_service_id.sous_categorie_id.categorie.icon
            ):
                icon = offre.type_service_id.sous_categorie_id.categorie.icon
            lst_icon_offre_service.append(icon)

            distance = None
            if offre.membre:
                distance = find_distance_from_user(env, offre.membre.adresse)
            lst_distance_offre_service.append(distance)

        accorderie_demande_service_cls = env["accorderie.demande.service"]
        accorderie_demande_service_ids = (
            accorderie_demande_service_cls.sudo()
            .search(
                [("website_published", "=", True)],
                order="create_date desc",
                limit=3,
            )
            .ids
        )
        demande_services = accorderie_demande_service_cls.sudo().browse(
            accorderie_demande_service_ids
        )
        demande_services_count = (
            accorderie_demande_service_cls.sudo().search_count(
                [("website_published", "=", True)]
            )
        )
        lst_icon_demande_service = []
        lst_distance_demande_service = []
        for demande in demande_services:
            icon = None
            # if (
            #     demande.type_service_id
            #     and demande.type_service_id.sous_categorie_id
            #     and demande.type_service_id.sous_categorie_id.categorie
            #     and demande.type_service_id.sous_categorie_id.categorie.icon
            # ):
            #     icon = demande.type_service_id.sous_categorie_id.categorie.icon
            lst_icon_demande_service.append(icon)
            distance = None
            lst_distance_demande_service.append(distance)

        lst_time_diff_offre_service = []
        lst_time_diff_demande_service = []
        timedate_now = datetime.now()
        # fr_CA not exist
        # check .venv/lib/python3.7/site-packages/humanize/locale/
        _t = humanize.i18n.activate("fr_FR")
        for accorderie_offre_service_id in offre_services:
            diff_time = timedate_now - accorderie_offre_service_id.create_date
            str_diff_time = humanize.naturaltime(diff_time).capitalize() + "."
            lst_time_diff_offre_service.append(str_diff_time)
        for accorderie_demande_service_id in demande_services:
            diff_time = (
                timedate_now - accorderie_demande_service_id.create_date
            )
            str_diff_time = humanize.naturaltime(diff_time).capitalize() + "."
            lst_time_diff_demande_service.append(str_diff_time)
        humanize.i18n.deactivate()

        dct_value = {
            "offre_services": offre_services,
            "offre_services_count": offre_services_count,
            "lst_icon_offre_service": lst_icon_offre_service,
            "lst_distance_offre_service": lst_distance_offre_service,
            "lst_time_offre_service": lst_time_diff_offre_service,
            "demande_services": demande_services,
            "lst_time_demande_service": lst_time_diff_demande_service,
            "demande_services_count": demande_services_count,
            "lst_icon_demande_service": lst_icon_demande_service,
            "lst_distance_demande_service": lst_distance_demande_service,
        }

        # Render page
        return request.env["ir.ui.view"].render_template(
            "website_accorderie.accorderie_offre_service_and_accorderie_demande_service_list_liste_offre_et_demande_service",
            dct_value,
        )

    @http.route(
        ["/accorderie/type_service_categorie/<int:type_service_categorie>"],
        type="http",
        auth="user",
        website=True,
    )
    def get_page_type_service_categorie(
        self, type_service_categorie=None, **kw
    ):
        env = request.env(context=dict(request.env.context))

        accorderie_type_service_categorie_cls = env[
            "accorderie.type.service.categorie"
        ]
        if type_service_categorie:
            accorderie_type_service_categorie_id = (
                accorderie_type_service_categorie_cls.sudo()
                .browse(type_service_categorie)
                .exists()
            )
        else:
            accorderie_type_service_categorie_id = None
        dct_value = {
            "accorderie_type_service_categorie_id": accorderie_type_service_categorie_id
        }

        # Render page
        return request.render(
            "website_accorderie.accorderie_type_service_categorie_unit_liste_type_service_categorie",
            dct_value,
        )

    @http.route(
        ["/accorderie/type_service_categorie_list"],
        type="json",
        auth="user",
        website=True,
    )
    def get_type_service_categorie_list(self, **kw):
        env = request.env(context=dict(request.env.context))

        accorderie_type_service_categorie_cls = env[
            "accorderie.type.service.categorie"
        ]
        accorderie_type_service_categorie_ids = (
            accorderie_type_service_categorie_cls.sudo().search([]).ids
        )
        type_service_categories = (
            accorderie_type_service_categorie_cls.sudo().browse(
                accorderie_type_service_categorie_ids
            )
        )

        dct_value = {"type_service_categories": type_service_categories}

        # Render page
        return request.env["ir.ui.view"].render_template(
            "website_accorderie.accorderie_type_service_categorie_list_liste_type_service_categorie",
            dct_value,
        )

    @http.route(
        ["/participer"],
        type="http",
        auth="user",
        website=True,
    )
    def get_page_participer(self, **kw):
        env = request.env(context=dict(request.env.context))

        accorderie_type_service_categorie_cls = env[
            "accorderie.type.service.categorie"
        ]
        accorderie_type_service_categorie_ids = (
            accorderie_type_service_categorie_cls.sudo().search([])
        )

        dct_value = {
            "type_service_categories": accorderie_type_service_categorie_ids
        }

        # Render page
        return request.env["ir.ui.view"].render_template(
            "website_accorderie.accorderie_type_service_categorie_list_publication",
            dct_value,
        )

    @http.route(
        ["/monprofil/mapresentation"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monprofil_mapresentation(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_ma_presentation"
        ).render()

    @http.route(
        ["/communaute/actualite"],
        type="http",
        auth="user",
        website=True,
    )
    def get_communaute_actualite(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_communaute"
        ).render()

    @http.route(
        ["/monprofil/mesannonces"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monprofil_mesannonces(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mes_annonces_publiees"
        ).render()

    @http.route(
        ["/communaute/evenements"],
        type="http",
        auth="user",
        website=True,
    )
    def get_communaute_evenements(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_communaute_1"
        ).render()

    @http.route(
        ["/explorer"],
        type="http",
        auth="user",
        website=True,
    )
    def get_explorer(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_explorer"
        ).render()

    @http.route(
        ["/monactivite/mesgroupes"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monactivite_mesgroupes(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mes_groupes"
        ).render()

    @http.route(
        ["/monprofil/mesfavoris"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monprofil_mesfavoris(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mes_favoris"
        ).render()

    @http.route(
        ["/communaute/groupes"],
        type="http",
        auth="user",
        website=True,
    )
    def get_communaute_groupes(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_communaute_2"
        ).render()

    @http.route(
        ["/evenement"],
        type="http",
        auth="user",
        website=True,
    )
    def get_evenement(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_evenement"
        ).render()

    @http.route(
        ["/monprofil/mespreferences"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monprofil_mespreferences(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mes_preferences"
        ).render()

    @http.route(
        ["/communaute/membres"],
        type="http",
        auth="user",
        website=True,
    )
    def get_communaute_membres(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_membres"
        ).render()

    @http.route(
        ["/monprofil/mesinfos"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monprofil_mesinfos(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mes_informations_personnelles"
        ).render()

    @http.route(
        ["/monactivite/monreseau"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monactivite_monreseau(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mon_reseau"
        ).render()

    @http.route(
        ["/monprofil"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monprofil(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mon_profil"
        ).render()

    @http.route(
        ["/monactivite/echanges"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monactivite_echanges(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_echanges"
        ).render()

    @http.route(
        ["/monactivite/echange"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monactivite_echange(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_echange"
        ).render()

    @http.route(
        ["/publier-offre"],
        type="http",
        auth="user",
        website=True,
    )
    def get_publier_offre(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_publier_offre"
        ).render()

    @http.route(
        ["/notification"],
        type="http",
        auth="user",
        website=True,
    )
    def get_notification(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_messages_et_notifications"
        ).render()

    @http.route(
        ["/monactivite"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monactivite(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mon_activite"
        ).render()

    @http.route(
        ["/offresservice"],
        type="http",
        auth="user",
        website=True,
    )
    def get_offresservice(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_offres_service"
        ).render()

    @http.route(
        ["/demandesservice"],
        type="http",
        auth="user",
        website=True,
    )
    def get_demandesservice(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_demandes_service"
        ).render()

    @http.route(
        ["/monactivite/monagenda"],
        type="http",
        auth="user",
        website=True,
    )
    def get_monactivite_monagenda(self, **kw):
        return request.env.ref(
            "website_accorderie.ir_ui_view_mon_agenda"
        ).render()

    def _transform_str_diff_time_creation(self, create_date):
        if not create_date:
            return ""
        timedate_now = datetime.now()
        _t = humanize.i18n.activate("fr_FR")
        diff_time_creation = timedate_now - create_date
        str_diff_time_creation = humanize.naturaltime(diff_time_creation)
        humanize.i18n.deactivate()
        return str_diff_time_creation

    @staticmethod
    def get_membre_id():
        partner_id = http.request.env.user.partner_id
        # TODO wrong algorithm, but use instead 'auth="user",'
        if not partner_id or http.request.auth_method == "public":
            return {"error": _("User not connected")}

        # membre_id = partner_id.accorderie_membre_ids
        membre_id = request.env["accorderie.membre"].search(
            [("partner_id", "=", partner_id.id)], limit=1
        )

        if not membre_id:
            return {
                "error": _(
                    "Your account is not associate to an accorderie"
                    " configuration. Please contact your administrator."
                )
            }
        return membre_id

    def datetime_to_local(self, field_input):
        # Source 'def datetime(self, field_label, field_input):'
        user_tz = pytz.timezone(
            request.context.get("tz") or request.env.user.tz or "UTC"
        )
        if not request.context.get("tz"):
            _logger.warning(
                f"User id '{request.context.get('uid')}' missing timezone, not"
                " configure."
            )
        if field_input is False:
            _logger.error("Field value is empty.")
            return None
        local_time = pytz.utc.localize(field_input).astimezone(user_tz)
        return local_time

    def _generate_dct_echange_service(self, echange_service_id, est_acheteur):
        date_echange = echange_service_id.date_echange

        if echange_service_id.date_echange is False:
            _logger.warning(
                f"Echange service id '{echange_service_id.id}' missing"
                " date_echange."
            )
            date_echange = echange_service_id.create_date

        if echange_service_id.transaction_valide:
            end_date = date_echange + dt.timedelta(
                hours=echange_service_id.nb_heure
            )
        else:
            end_date = date_echange + dt.timedelta(
                hours=echange_service_id.nb_heure_estime
            )

        dct_echange_item = {
            "id": echange_service_id.id,
            "transaction_valide": echange_service_id.transaction_valide,
            "membre": {
                "id": echange_service_id.membre_vendeur.id
                if est_acheteur
                else echange_service_id.membre_acheteur.id,
                "full_name": echange_service_id.membre_vendeur.nom
                if est_acheteur
                else echange_service_id.membre_acheteur.nom,
            },
            "sujet_offre_service": echange_service_id.offre_service.titre,
            "description_offre_service": echange_service_id.offre_service.description,
            "categorie_offre_service": echange_service_id.offre_service.type_service_id.nom_complet,
            "has_offre_service": bool(echange_service_id.offre_service),
            "sujet_demande_service": echange_service_id.demande_service.titre,
            "description_demande_service": echange_service_id.demande_service.description,
            "categorie_demande_service": echange_service_id.demande_service.type_service_id.nom_complet,
            "has_demande_service": bool(echange_service_id.demande_service),
            "date": self.datetime_to_local(echange_service_id.date_echange),
            "end_date": self.datetime_to_local(end_date),
            "temps": date_echange.hour + date_echange.minute / 60.0,
            "duree_estime": echange_service_id.nb_heure_estime,
            "duree": echange_service_id.nb_heure,
            "duree_trajet_estime": echange_service_id.nb_heure_estime_duree_trajet,
            "duree_trajet": echange_service_id.nb_heure_duree_trajet,
            "frais_trajet": echange_service_id.frais_trajet,
            "distance_trajet": echange_service_id.distance_trajet,
            "frais_materiel": echange_service_id.frais_materiel,
            "commentaire": echange_service_id.commentaire,
            "estAcheteur": est_acheteur,
        }
        return dct_echange_item

    @http.route(
        [
            "/accorderie/get_personal_information",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_personal_information(self, **kw):
        membre_id = self.get_membre_id()
        if type(membre_id) is dict:
            # This is an error
            return membre_id

        str_diff_time_creation = self._transform_str_diff_time_creation(
            membre_id.create_date
        )

        dct_offre_service = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "website_published": a.website_published,
                "is_favorite": membre_id.id in a.membre_favoris_ids.ids,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom,
                    "ma_photo": a.membre.logo_attachment_id.local_url,
                },
                "distance": "8m",
            }
            for a in membre_id.offre_service_ids
        }

        dct_offre_service_favoris = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "is_favorite": True,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom,
                    "ma_photo": a.membre.logo_attachment_id.local_url,
                },
                "distance": "8m",
            }
            for a in http.request.env["accorderie.offre.service"].search(
                [("membre_favoris_ids", "=", membre_id.id)]
            )
            if a.website_published
        }

        dct_demande_service = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "website_published": a.website_published,
                "is_favorite": membre_id.id in a.membre_favoris_ids.ids,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom,
                    "ma_photo": a.membre.logo_attachment_id.local_url,
                },
                "distance": "8m",
            }
            for a in membre_id.demande_service_ids
        }

        dct_demande_service_favoris = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "is_favorite": True,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom,
                    "ma_photo": a.membre.logo_attachment_id.local_url,
                },
                "distance": "8m",
            }
            for a in http.request.env["accorderie.demande.service"].search(
                [("membre_favoris_ids", "=", membre_id.id)]
            )
            if a.website_published
        }

        dct_membre_favoris = {
            a.membre_id.id: {
                "id": a.membre_id.id,
                "ma_photo": a.membre_id.logo_attachment_id.local_url,
                "description": a.membre_id.introduction,
                "age": 35,
                "is_favorite": True,
                "full_name": a.membre_id.nom,
                "distance": "8m",
            }
            for a in membre_id.membre_favoris_ids
        }

        is_favorite = membre_id.id in [
            a.membre_id.id for a in membre_id.membre_favoris_ids
        ]

        dct_echange = {}
        for echange_service_id in membre_id.echange_service_acheteur_ids:
            dct_echange_item = self._generate_dct_echange_service(
                echange_service_id, True
            )
            dct_echange[echange_service_id.id] = dct_echange_item

        for echange_service_id in membre_id.echange_service_vendeur_ids:
            dct_echange_item = self._generate_dct_echange_service(
                echange_service_id, False
            )
            dct_echange[echange_service_id.id] = dct_echange_item

        # TODO update location with cartier et autre
        # Hack time for demo
        # month_bank_time = 0
        # v1 = http.request.env["accorderie.echange.service"].search(
        #     [
        #         ("membre_vendeur", "=", membre_id.id),
        #         ("transaction_valide", "=", True),
        #     ]
        # )
        # for v in v1:
        #     month_bank_time += v.nb_heure
        # v2 = http.request.env["accorderie.echange.service"].search(
        #     [
        #         ("membre_acheteur", "=", membre_id.id),
        #         ("transaction_valide", "=", True),
        #     ]
        # )
        # for v in v2:
        #     month_bank_time -= v.nb_heure
        # bank_time = 15 + month_bank_time

        lst_notification = [
            a.first_to_json()
            for a in http.request.env[
                "accorderie.echange.service.notification"
            ].search([("membre_id", "=", membre_id.id)])
        ]

        data = {
            "global": {
                "dbname": http.request.env.cr.dbname,
            },
            "lst_notification": lst_notification,
            "personal": {
                "id": membre_id.id,
                "full_name": membre_id.nom,
                "ma_photo": membre_id.logo_attachment_id.local_url,
                # "actual_bank_hours": bank_time,
                "actual_bank_hours": membre_id.bank_time,
                # "actual_month_bank_hours": month_bank_time,
                "actual_month_bank_hours": membre_id.bank_month_time,
                "is_favorite": is_favorite,
                "introduction": membre_id.introduction,
                "diff_humain_creation_membre": str_diff_time_creation,
                "location": membre_id.ville.nom,
                "antecedent_judiciaire_verifier": membre_id.antecedent_judiciaire_verifier,
                "mon_accorderie": {
                    "name": membre_id.accorderie.nom,
                    "id": membre_id.accorderie.id,
                },
                "dct_offre_service": dct_offre_service,
                "dct_demande_service": dct_demande_service,
                "dct_offre_service_favoris": dct_offre_service_favoris,
                "dct_demande_service_favoris": dct_demande_service_favoris,
                "dct_membre_favoris": dct_membre_favoris,
                "dct_echange": dct_echange,
            },
        }
        return data

    @http.route(
        "/accorderie/personal_information/submit",
        type="json",
        auth="user",
        website=True,
        csrf=True,
    )
    def accorderie_personal_information_form_submit(self, **kw):
        membre_id = self.get_membre_id()
        if type(membre_id) is dict:
            # This is an error
            return membre_id

        status = True
        ma_photo = kw.get("ma_photo")
        introduction = kw.get("introduction")
        if "ma_photo" in kw.keys():
            # TODO do we need validation? like extension or supported file
            membre_id.logo = ma_photo.split(",")[1].encode("utf-8")
        if "introduction" in kw.keys():
            membre_id.introduction = introduction
        return status

    @http.route(
        [
            "/accorderie/get_membre_information/<model('accorderie.membre'):membre_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_membre_information(self, membre_id, **kw):
        # membre_id = self.get_membre_id()
        # if type(membre_id) is dict:
        #     # This is an error
        #     return membre_id

        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        actual_membre_id = self.get_membre_id()
        if type(actual_membre_id) is dict:
            # This is an error
            return actual_membre_id

        str_diff_time_creation = self._transform_str_diff_time_creation(
            membre_id.create_date
        )

        dct_offre_service = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "website_published": a.website_published,
                "is_favorite": me_membre_id.id in a.membre_favoris_ids.ids,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom,
                },
                "distance": "8m",
            }
            for a in membre_id.offre_service_ids
        }

        dct_demande_service = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "is_favorite": me_membre_id.id in a.membre_favoris_ids.ids,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom,
                },
                "distance": "8m",
            }
            for a in membre_id.demande_service_ids
            if a.website_published
        }

        is_favorite = membre_id.id in [
            a.membre_id.id for a in actual_membre_id.membre_favoris_ids
        ]

        return {
            "membre_info": {
                "id": membre_id.id,
                "full_name": membre_id.nom,
                "ma_photo": membre_id.logo_attachment_id.local_url,
                "bank_max_service_offert": membre_id.bank_max_service_offert,
                "actual_bank_hours": membre_id.bank_time,
                "actual_month_bank_hours": membre_id.bank_month_time,
                "is_favorite": is_favorite,
                "introduction": membre_id.introduction,
                "diff_humain_creation_membre": str_diff_time_creation,
                "date_creation": self.datetime_to_local(membre_id.create_date),
                "location": membre_id.ville.nom,
                "antecedent_judiciaire_verifier": membre_id.antecedent_judiciaire_verifier,
                "sexe": membre_id.sexe,
                "mon_accorderie": {
                    "name": membre_id.accorderie.nom,
                    "id": membre_id.accorderie.id,
                },
                "dct_offre_service": dct_offre_service,
                "len_offre_service": len(dct_offre_service),
                "dct_demande_service": dct_demande_service,
                "len_demande_service": len(dct_demande_service),
            }
        }

    @http.route(
        [
            "/accorderie/get_info/offre_service/<model('accorderie.membre'):membre_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_participer_workflow_data_offre_service(self, membre_id, **kw):
        lst_mes_offre_de_service = [
            {
                "id": a.id,
                # "html": a.description,
                "right_html": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "title": a.titre,
            }
            for a in membre_id.offre_service_ids
        ]
        return {"data": {"ses_offres_de_service": lst_mes_offre_de_service}}

    @http.route(
        [
            "/accorderie/get_info/demande_service/<model('accorderie.membre'):membre_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_participer_workflow_data_demande_service(self, membre_id, **kw):
        lst_mes_demande_de_service = [
            {
                "id": a.id,
                # "html": a.description,
                "right_html": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "title": a.titre,
            }
            for a in membre_id.demande_service_ids
        ]
        return {
            "data": {"ses_demandes_de_service": lst_mes_demande_de_service}
        }

    @http.route(
        [
            "/accorderie/get_info/list_membre",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_info_list_membre(self, accorderie_id, **kw):
        my_favorite_membre_id = [
            a.membre_id.id
            for a in http.request.env.user.partner_id.accorderie_membre_ids.membre_favoris_ids
        ]
        lst_membre = http.request.env["accorderie.membre"].search(
            [
                ("accorderie", "=", accorderie_id),
                ("profil_approuver", "=", True),
            ]
        )
        dct_membre = {
            a.id: {
                "age": a.age,
                "ma_photo": a.logo_attachment_id.local_url,
                "full_name": a.nom,
                "annee_naissance": a.annee_naissance,
                "antecedent_judiciaire_verifier": a.antecedent_judiciaire_verifier,
                "bank_time": a.bank_time,
                "bank_month_time": a.bank_month_time,
                "date_adhesion": a.date_adhesion,
                "introduction": a.introduction if a.introduction else "",
                "is_favorite": a.id in my_favorite_membre_id,
            }
            for a in lst_membre
        }
        return {"dct_membre": dct_membre}

    @http.route(
        [
            "/accorderie/get_info/nb_offre_service",
        ],
        type="json",
        auth="public",
        website=True,
    )
    def get_nb_offre_service(self, **kw):
        nb_offre_service = (
            http.request.env["accorderie.offre.service"]
            .sudo()
            .search_count([("website_published", "=", True)])
        )
        return {"nb_offre_service": nb_offre_service}

    # @http.route(
    #     [
    #         "/accorderie/get_info/echange_service/<model('accorderie.membre'):membre_id>",
    #     ],
    #     type="json",
    #     auth="user",
    #     website=True,
    # )
    # def get_participer_workflow_data_echange_service(self, membre_id, **kw):
    #     me_membre_id = self.get_membre_id()
    #     if type(me_membre_id) is dict:
    #         # This is an error
    #         return me_membre_id
    #
    #     lst_mes_echanges_de_service_recu_sans_demande_non_valide = [
    #         {
    #             "id": a.id,
    #             "right_html": a.create_date,
    #             "title": a.titre,
    #         }
    #         for a in me_membre_id.echange_service_acheteur_ids
    #         if not a.transaction_valide
    #         and not a.demande_service
    #         and a.membre_vendeur.id == membre_id.id
    #     ]
    #
    #     return {
    #         "data": {
    #             "mes_echanges_de_service_recu_sans_demande_non_valide": lst_mes_echanges_de_service_recu_sans_demande_non_valide
    #         }
    #     }

    @http.route(
        [
            "/accorderie/get_info/recevoir_service/<model('accorderie.membre'):membre_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_participer_workflow_data_recevoir_service(self, membre_id, **kw):
        me_membre_id = self.get_membre_id()
        if type(me_membre_id) is dict:
            # This is an error
            return me_membre_id

        lst_mes_echanges_de_service_recu_sans_demande_non_valide = [
            {
                "id": a.id,
                "right_html": self.datetime_to_local(a.create_date),
                "title": a.titre,
            }
            for a in me_membre_id.echange_service_acheteur_ids
            if not a.transaction_valide
            and not a.demande_service
            and a.membre_vendeur.id == membre_id.id
        ]

        return {
            "data": {
                "ses_temps_disponibles": lst_mes_echanges_de_service_recu_sans_demande_non_valide
            }
        }

    @http.route(
        [
            "/accorderie/get_participer_workflow_data",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_participer_workflow_data(self, **kw):
        # List type
        # A - Selection static : selection_static
        # B - Choix catégorie de service : choix_categorie_de_service
        # C - Choix membre : choix_membre
        # D - Selection dynamique (option new, option id) : selection_dynamique
        # E - Calendrier : calendrier
        # F - Temps + durée : temps_duree
        # G - Formulaire (xml_item_id) : form
        membre_id = self.get_membre_id()
        if type(membre_id) is dict:
            # This is an error
            return membre_id

        env = request.env(context=dict(request.env.context))

        # Remove itself member
        accorderie_membre_ids = (
            env["accorderie.membre"]
            .sudo()
            .search([("id", "!=", membre_id.id)])
        )
        lst_membre = [
            {
                "title": a.nom,
                "id": a.id,
                "img": a.logo_attachment_id.local_url,
            }
            for a in accorderie_membre_ids
        ]
        accorderie_type_service_categorie_ids = (
            env["accorderie.type.service.categorie"].sudo().search([])
        )
        dct_data_inner_type_service_categorie = {}

        lst_type_service_categorie = []
        for a in accorderie_type_service_categorie_ids:
            sub_list = []
            obj_data = {
                "id": a.id,
                "tree_id": f"{a.id}",
                "html": a._get_html_nom(),
                "title": a._get_separate_list_nom(),
                "icon": image_data_uri(a.icon) if a.icon else "",
                "sub_list": sub_list,
            }
            lst_type_service_categorie.append(obj_data)
            for b in a.type_service_sous_categorie:
                sub_sub_list = []
                sub_obj_data = {
                    "id": b.id,
                    "tree_id": f"{a.id}.{b.id}",
                    "html": b.nom,
                    "title": b.nom,
                    "sub_list": sub_sub_list,
                }
                sub_list.append(sub_obj_data)
                for c in b.type_service:
                    sub_sub_obj_data = {
                        "html": c.nom,
                        "title": c.nom,
                        "id": c.id,
                        "tree_id": f"{a.id}.{b.id}.{c.id}",
                    }
                    sub_sub_list.append(sub_sub_obj_data)
                    dct_data_inner_type_service_categorie[
                        c.id
                    ] = sub_sub_obj_data

        lst_mes_offre_de_service = [
            {
                "id": a.id,
                # "html": a.description,
                "right_html": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "title": a.titre,
            }
            for a in membre_id.offre_service_ids
        ]

        # lst_mes_echanges_de_service_non_valide
        lst_echange_acheteur = [
            {
                "id": a.id,
                "html": f"Par {a.membre_vendeur.nom}",
                "right_html": self.datetime_to_local(a.create_date),
                "title": a.titre,
            }
            for a in membre_id.echange_service_acheteur_ids
            # if not a.transaction_valide and a.demande_service
            if not a.transaction_valide
        ]

        lst_echange_vendeur = [
            {
                "id": a.id,
                "html": f"Pour {a.membre_acheteur.nom}",
                "right_html": self.datetime_to_local(a.create_date),
                "title": a.titre,
            }
            for a in membre_id.echange_service_vendeur_ids
            # if not a.transaction_valide and a.demande_service
            if not a.transaction_valide
        ]

        # TODO order by time
        lst_mes_echanges_de_service_non_valide = (
            lst_echange_acheteur + lst_echange_vendeur
        )
        lst_mes_echanges_de_service_non_valide.sort(
            key=lambda x: x["right_html"]
        )

        # lst_mes_echanges_de_service_offert_sans_demande_non_valide
        # lst_mes_echanges_de_service_offert_sans_demande_non_valide = [
        #     {
        #         "id": a.id,
        #         "right_html": a.create_date,
        #         "title": a.titre,
        #     }
        #     for a in membre_id.echange_service_vendeur_ids
        #     if not a.transaction_valide and not a.demande_service
        # ]

        dct_workflow_empty = (
            {
                "init": {
                    "id": "init",
                    "message": (
                        "La procédure de participation est actuelle non"
                        " disponible. Veuillez informer votre administrateur."
                    ),
                    "type": "selection_static",
                },
            },
        )

        json_data = {
            "data": {
                "type_service_categorie": lst_type_service_categorie,
                "membre": lst_membre,
                "mes_offres_de_service": lst_mes_offre_de_service,
                "mes_echanges_de_service_non_valide": lst_mes_echanges_de_service_non_valide,
                # "mes_echanges_de_service_avec_demande_non_valide": lst_mes_echanges_de_service_avec_demande_non_valide,
                # "mes_echanges_de_service_offert_sans_demande_non_valide": lst_mes_echanges_de_service_offert_sans_demande_non_valide,
            },
            "data_inner": {
                "type_service_categorie": dct_data_inner_type_service_categorie
            },
        }

        workflow_ids = env["accorderie.workflow"].sudo().search([], limit=1)

        if not workflow_ids:
            json_data["workflow"] = dct_workflow_empty
        else:
            dct_workflow = {}

            for state_id in workflow_ids.diagram_state_ids:
                dct_state = {"id": state_id.key}
                if state_id.message:
                    dct_state["message"] = state_id.message
                # if state_id.name:
                #     dct_state["title"] = state_id.name
                if state_id.type:
                    dct_state["type"] = state_id.type
                if state_id.show_breadcrumb:
                    dct_state["show_breadcrumb"] = state_id.show_breadcrumb
                if state_id.maquette_link:
                    dct_state["maquette_link"] = state_id.maquette_link
                if state_id.breadcrumb_value:
                    dct_state["breadcrumb_value"] = state_id.breadcrumb_value
                if state_id.breadcrumb_show_only_last_item:
                    dct_state[
                        "breadcrumb_show_only_last_item"
                    ] = state_id.breadcrumb_show_only_last_item
                if state_id.breadcrumb_field_value:
                    dct_state[
                        "breadcrumb_field_value"
                    ] = state_id.breadcrumb_field_value
                if state_id.model_field_name_alias:
                    dct_state[
                        "model_field_name_alias"
                    ] = state_id.model_field_name_alias
                if state_id.model_field_depend:
                    dct_state[
                        "model_field_depend"
                    ] = state_id.model_field_depend
                if state_id.data_url_field:
                    dct_state["data_url_field"] = state_id.data_url_field
                if state_id.data_update_url:
                    dct_state["data_update_url"] = state_id.data_update_url
                if state_id.force_update_data:
                    dct_state["force_update_data"] = state_id.force_update_data
                if state_id.model_field_name:
                    dct_state["model_field_name"] = state_id.model_field_name
                if state_id.disable_question:
                    dct_state["disable_question"] = state_id.disable_question
                if state_id.submit_button_text:
                    dct_state[
                        "submit_button_text"
                    ] = state_id.submit_button_text
                if state_id.submit_response_title:
                    dct_state[
                        "submit_response_title"
                    ] = state_id.submit_response_title
                if state_id.caract_offre_demande_nouveau_existante:
                    dct_state[
                        "caract_offre_demande_nouveau_existante"
                    ] = state_id.caract_offre_demande_nouveau_existante
                if state_id.caract_echange_nouvel_existant:
                    dct_state[
                        "caract_echange_nouvel_existant"
                    ] = state_id.caract_echange_nouvel_existant
                if state_id.caract_service_offrir_recevoir:
                    dct_state[
                        "caract_service_offrir_recevoir"
                    ] = state_id.caract_service_offrir_recevoir
                if state_id.caract_valider_echange:
                    dct_state[
                        "caract_valider_echange"
                    ] = state_id.caract_valider_echange
                if state_id.help_caract_lst:
                    dct_state["help_caract_lst"] = state_id.help_caract_lst
                if state_id.submit_response_description:
                    dct_state[
                        "submit_response_description"
                    ] = state_id.submit_response_description
                if state_id.list_is_first_position:
                    dct_state[
                        "list_is_first_position"
                    ] = state_id.list_is_first_position
                if state_id.data:
                    dct_state["data_name"] = state_id.data
                if state_id.state_src_ids:
                    if state_id.type in (
                        "selection_static",
                        "selection_dynamique",
                    ):
                        lst_item = []
                        dct_state["list"] = lst_item
                        for relation in state_id.state_src_ids:
                            if not relation.is_dynamic:
                                dct_item = {}
                                if relation.state_dst:
                                    dct_item["id"] = relation.state_dst.key
                                if relation.name:
                                    dct_item["title"] = relation.name
                                if (
                                    relation.body_html
                                    and relation.body_html != "<p><br></p>"
                                ):
                                    dct_item["html"] = relation.body_html
                                if relation.not_implemented:
                                    dct_item[
                                        "not_implemented"
                                    ] = relation.not_implemented
                                if relation.icon:
                                    dct_item["icon"] = relation.icon
                                lst_item.append(dct_item)
                            else:
                                dct_state[
                                    "next_id_data"
                                ] = relation.state_dst.key

                    else:
                        dct_state["next_id"] = state_id.state_src_ids[
                            0
                        ].state_dst.key
                dct_workflow[state_id.key] = dct_state

            json_data["workflow"] = dct_workflow
        return json_data

    @http.route(
        [
            "/accorderie/get_help_data",
        ],
        type="json",
        auth="public",
        website=True,
    )
    def get_help_data(self, **kw):
        data = {}
        env = request.env(context=dict(request.env.context))
        state_ids = (
            env["accorderie.workflow.state"]
            .sudo()
            .search([("help_title", "!=", False)])
        )
        data["state_section"] = {}
        # association
        # TODO move this in data
        lst_u_caract = set()
        data["dct_unique_caract"] = {
            "Valider échange": False,
            "Échange nouvel/existant": {
                "Échange existant": "fa-file",
                "Nouvel échange": "fa-plus",
            },
            "Service à offrir/recevoir": {
                "Service à offrir": "fa-hand-holding-usd",
                "Service à recevoir": "fa-hands-helping",
            },
            "Demande nouvelle/existante": {
                "Demande existante": "fa-file",
                "Nouvelle demande": "fa-plus",
            },
            "Offre nouvelle/existante": {
                "Offre existante": "fa-file",
                "Nouvelle offre": "fa-plus",
            },
            "Offre publique/privée": {
                "Offre publique": "fa-eye",
                "Offre privée": "fa-eye-slash",
            },
            "Demande publique/privée": {
                "Demande publique": "fa-eye",
                "Demande privée": "fa-eye-slash",
            },
            "Offre ponctuelle": False,
            "Demande ponctuelle": False,
            "Offre de groupe": False,
        }
        data["dct_unique_caract_concat"] = {
            "Valider échange": False,
            "Échange nouvel/existant": {
                "Échange existant": "fa-file",
                "Nouvel échange": "fa-plus",
            },
            "Service à offrir/recevoir": {
                "Service à offrir": "fa-hand-holding-usd",
                "Service à recevoir": "fa-hands-helping",
            },
            "Offre/<font style='color:#00FF00'>Demande</font> nouvelle/existante": {
                "Demande existante": "fa-file fa-inverse",
                "Nouvelle demande": "fa-plus fa-inverse",
                "Offre existante": "fa-file",
                "Nouvelle offre": "fa-plus",
            },
            # "Demande nouvelle/existante": {
            #     "Demande existante": "fa-file",
            #     "Nouvelle demande": "fa-plus",
            # },
            # "Offre nouvelle/existante": {
            #     "Offre existante": "fa-file",
            #     "Nouvelle offre": "fa-plus",
            # },
            "Offre/<font style='color:#00FF00'>Demande</font> publique/privée": {
                "Offre publique": "fa-eye",
                "Offre privée": "fa-eye-slash",
                "Demande publique": "fa-eye fa-inverse",
                "Demande privée": "fa-eye-slash fa-inverse",
            },
            # "Offre publique/privée": {
            #     "Offre publique": "fa-eye",
            #     "Offre privée": "fa-eye-slash",
            # },
            # "Demande publique/privée": {
            #     "Demande publique": "fa-eye",
            #     "Demande privée": "fa-eye-slash",
            # },
            "Offre/<font style='color:#00FF00'>Demande</font> ponctuelle": {
                "Offre ponctuelle": "fa-check",
                "Demande ponctuelle": "fa-check fa-inverse",
            },
            # "Offre ponctuelle": False,
            # "Demande ponctuelle": False,
            "Offre de groupe": False,
        }
        lst_u_caract.update(
            [k for k, a in data["dct_unique_caract"].items() if a is False]
        )
        lst_u_caract.update(
            [
                q
                for w in [
                    [i for i in a.keys()]
                    for k, a in data["dct_unique_caract"].items()
                    if type(a) is dict
                ]
                for q in w
            ]
        )
        lst_u_caract.update(
            [a for a in data["dct_unique_caract_concat"].keys()]
        )

        # Find all model_field_name associate with model_field_name_alias
        dct_model_field_name = {
            a.model_field_name: a.model_field_name_alias
            for a in env["accorderie.workflow.state"]
            .sudo()
            .search(
                [
                    ("model_field_name", "!=", False),
                    ("model_field_name_alias", "!=", False),
                ]
            )
        }
        # Find already member
        membre_id = (
            env["accorderie.membre"]
            .sudo()
            .search(
                [
                    ("partner_id.user_ids", "!=", env.user.id),
                ],
                limit=1,
            )
        )
        if http.request.env.user.partner_id.id == 4:
            # TODO find better solution, validate it's associate with member
            # Detect if user is public
            actual_membre_id = None
        else:
            actual_membre_id = env["accorderie.membre"].search(
                [("partner_id.user_ids", "=", env.user.id)]
            )

        set_caract = set()
        lst_state = []
        for state_id in state_ids:
            sub_data = {
                "id": state_id.key,
                "key": state_id.key,
                # Add space after each 2 words, to fit in table
                "key_space": ".".join(
                    [
                        b if not idx or idx % 2 else f" {b}"
                        for idx, b in enumerate(state_id.key.split("."))
                    ]
                ),
                "title": state_id.help_title,
                "description": state_id.help_description,
                "fast_btn_title": state_id.help_fast_btn_title,
                "fast_btn_url": state_id.help_fast_btn_url,
                "fast_btn_guide_url": state_id.help_fast_btn_guide_url,
                "fast_btn_form_url": state_id.help_fast_btn_form_url,
                "maquette_link": state_id.maquette_link,
                "validate_bug": state_id.help_validate_bug,
                "video_url": state_id.help_video_url,
                "not_implemented": state_id.not_implemented,
            }
            if state_id.help_date_last_update:
                sub_data["date_last_update"] = self.datetime_to_local(
                    state_id.help_date_last_update
                )
            if state_id.caract_offre_demande_nouveau_existante:
                sub_data[
                    "caract_offre_demande_nouveau_existante"
                ] = state_id.caract_offre_demande_nouveau_existante
            if state_id.caract_echange_nouvel_existant:
                sub_data[
                    "caract_echange_nouvel_existant"
                ] = state_id.caract_echange_nouvel_existant
            if state_id.caract_service_offrir_recevoir:
                sub_data[
                    "caract_service_offrir_recevoir"
                ] = state_id.caract_service_offrir_recevoir
            if state_id.caract_valider_echange:
                sub_data[
                    "caract_valider_echange"
                ] = state_id.caract_valider_echange
            if state_id.help_caract_lst:
                sub_data["help_caract_lst"] = state_id.help_caract_lst

            if actual_membre_id is not None:
                # Need to be connected
                # generate automatic fast_btn_form_url
                if (
                    not state_id.not_implemented
                    # and state_id.model_field_depend
                    # and not state_id.help_fast_btn_form_url
                ):
                    fast_btn_form_url = f"participer#!?state={state_id.key}"
                    lst_param = []
                    if state_id.model_field_depend:
                        for model_field in state_id.model_field_depend.split(
                            ";"
                        ):
                            value = ""
                            # TODO missing associate model_field with model, so need to hardcode it
                            # TODO need to support automatic type workflow (recevoir/offrir)
                            if model_field == "type_service_id":
                                value = 122
                            elif model_field == "membre_id":
                                value = membre_id.id
                            elif model_field == "offre_service_id":
                                if (
                                    state_id.caract_service_offrir_recevoir
                                    == "Service à recevoir"
                                ):
                                    if membre_id.offre_service_ids:
                                        value = membre_id.offre_service_ids[
                                            0
                                        ].id
                                    else:
                                        _logger.warning(
                                            "Missing offre_service for member"
                                            f" id {actual_membre_id.id},"
                                            " ignore it."
                                        )
                                else:
                                    if actual_membre_id.offre_service_ids:
                                        value = (
                                            actual_membre_id.offre_service_ids[
                                                0
                                            ].id
                                        )
                                    else:
                                        _logger.warning(
                                            "Missing offre_service for member"
                                            f" id {actual_membre_id.id},"
                                            " ignore it."
                                        )
                            elif model_field == "demande_service_id":
                                if (
                                    state_id.caract_service_offrir_recevoir
                                    == "Service à offrir"
                                ):
                                    if membre_id.demande_service_ids:
                                        value = membre_id.demande_service_ids[
                                            0
                                        ].id
                                    else:
                                        _logger.warning(
                                            "cannot find demande service"
                                        )
                                else:
                                    _logger.warning(
                                        "Not supported, demande_service_id"
                                        " search for 'service à recevoir'"
                                    )
                            elif model_field == "echange_service_id":
                                if (
                                    state_id.caract_service_offrir_recevoir
                                    == "Service à recevoir"
                                ):
                                    if membre_id.echange_service_acheteur_ids:
                                        value = membre_id.echange_service_acheteur_ids[
                                            0
                                        ].id
                                    else:
                                        _logger.warning(
                                            "Missing offre_service for member"
                                            f" id {actual_membre_id.id},"
                                            " ignore it."
                                        )
                                elif (
                                    state_id.caract_service_offrir_recevoir
                                    == "Service à offrir"
                                ):
                                    if membre_id.echange_service_acheteur_ids:
                                        value = actual_membre_id.echange_service_vendeur_ids[
                                            0
                                        ].id
                                    else:
                                        _logger.warning(
                                            "Missing offre_service for member"
                                            f" id {actual_membre_id.id},"
                                            " ignore it."
                                        )
                                else:
                                    if (
                                        actual_membre_id.echange_service_acheteur_ids
                                    ):
                                        value = actual_membre_id.echange_service_acheteur_ids[
                                            0
                                        ].id
                                    else:
                                        _logger.warning(
                                            "Missing offre_service for member"
                                            f" id {actual_membre_id.id},"
                                            " ignore it."
                                        )
                            elif model_field == "date_service":
                                # Valide in the past, else in futur
                                if state_id.caract_valider_echange:
                                    value = (
                                        self.datetime_to_local(
                                            datetime.today()
                                        )
                                        - timedelta(days=3)
                                    ).strftime("%Y-%m-%d")
                                else:
                                    value = (
                                        self.datetime_to_local(
                                            datetime.today()
                                        )
                                        + timedelta(days=3)
                                    ).strftime("%Y-%m-%d")
                            elif model_field == "time_service":
                                value = self.datetime_to_local(
                                    datetime.today()
                                ).strftime("%H:%M")
                            else:
                                _logger.warning(
                                    "Not supported dynamic associate url:"
                                    f" {model_field}"
                                )
                            if value:
                                lst_param.append(
                                    f"{dct_model_field_name[model_field]}={value}"
                                )
                    if lst_param:
                        fast_btn_form_url += f"&{'&'.join(lst_param)}"
                    sub_data["fast_btn_form_url"] = fast_btn_form_url
            if state_id.model_field_depend:
                str_html_field_depend = "<br/>".join(
                    sorted(state_id.model_field_depend.split(";"))
                )
                sub_data["model_field_depend"] = str_html_field_depend

            if state_id.help_caract_lst:
                lst_caract = state_id.help_caract_lst.split(";")
                sub_data["lst_caract"] = lst_caract
                set_caract.update(lst_caract)

            sub_copy_data = sub_data.copy()
            sub_copy_data["section"] = state_id.help_section
            if state_id.help_sub_section:
                sub_copy_data["sub_section"] = state_id.help_sub_section
            lst_state.append(sub_copy_data)

            if state_id.help_section in data["state_section"].keys():
                if (
                    state_id.help_sub_section
                    in data["state_section"][state_id.help_section].keys()
                ):
                    data["state_section"][state_id.help_section][
                        state_id.help_sub_section
                    ].append(sub_data)
                else:
                    data["state_section"][state_id.help_section][
                        state_id.help_sub_section
                    ] = [sub_data]
            else:
                data["state_section"][state_id.help_section] = {
                    state_id.help_sub_section: [sub_data]
                }
        data["state"] = lst_state
        # lst_u_caract.update([a for a in data["dct_unique_caract"].keys()])
        # lst_u_caract.update([a for a in data["dct_unique_caract_concat"].keys()])
        lst_missing = {(k, False) for k in set_caract - lst_u_caract}
        data["dct_unique_caract"].update(lst_missing)
        data["dct_unique_caract_concat"].update(lst_missing)
        # for key in set_caract-lst_u_caract:
        #     data["dct_unique_caract"][key] = False
        #     data["dct_unique_caract_concat"][key] = False

        # set_caract.update(lst_u_caract)
        data["lst_unique_caract"] = sorted(list(set_caract))

        return {"data": data}

    @http.route(
        "/accorderie/participer/form/submit",
        type="json",
        auth="user",
        website=True,
        csrf=True,
    )
    def accorderie_participer_form_submit(self, **kw):
        # Send from participer website
        vals = {}
        status = {}
        str_state_id = kw.get("state_id")
        state_id = (
            http.request.env["accorderie.workflow.state"]
            .sudo()
            .search([("key", "=", str_state_id)], limit=1)
        )
        if not state_id:
            status["error"] = "Cannot find state_id from state.key"
            _logger.error(status["error"])
            return status

        membre_id = http.request.env.user.partner_id.accorderie_membre_ids.id

        demande_service_id = None
        offre_service_id = None
        new_accorderie_echange_service = None

        # if str_state_id in (
        #     "init.pos.single.form",
        #     "init.pds.single.form",
        #     "init.saa.offrir.nouveau.cat.form",
        #     "init.saa.recevoir.choix.nouveau.form",
        #     "init.va.non.offert.nouveau.cat.form",
        #     "init.va.non.recu.choix.nouveau.form",
        # ):
        if state_id.caract_offre_demande_nouveau_existante in (
            "Nouvelle demande",
            "Nouvelle offre",
        ):
            # TODO offre/demande nouveau
            if kw.get("offre_service_id"):
                # TODO how this can happen in context of nouveau?
                offre_service_id = int(kw.get("offre_service_id").get("id"))
            else:
                if kw.get("titre"):
                    vals["titre"] = kw.get("titre")

                if kw.get("description"):
                    description = kw.get("description").replace("\n", "<br/>")
                    vals["description"] = description

                if kw.get("type_service_id"):
                    type_service_id = kw.get("type_service_id")
                    if type(type_service_id) is dict:
                        type_service_id_id = type_service_id.get("id")
                        if type_service_id_id:
                            vals["type_service_id"] = type_service_id_id

                vals["membre"] = membre_id

                if (
                    state_id.caract_offre_demande_nouveau_existante
                    == "Nouvelle demande"
                ):
                    new_accorderie_service = request.env[
                        "accorderie.demande.service"
                    ].create(vals)
                    demande_service_id = new_accorderie_service.id
                    status["demande_service_id"] = demande_service_id
                elif (
                    state_id.caract_offre_demande_nouveau_existante
                    == "Nouvelle offre"
                ):
                    new_accorderie_service = request.env[
                        "accorderie.offre.service"
                    ].create(vals)
                    offre_service_id = new_accorderie_service.id
                    status["offre_service_id"] = offre_service_id

        # if str_state_id in (
        #     "init.saa.offrir.nouveau.cat.form",
        #     "init.saa.offrir.existant.form",
        #     "init.saa.recevoir.choix.existant.time.form",
        #     "init.saa.recevoir.choix.nouveau.form",
        #     "init.va.non.offert.nouveau.cat.form",
        #     # "init.va.non.offert.existant.form",
        #     # "init.va.non.recu.choix.form",
        #     "init.va.non.recu.choix.nouveau.form",
        # ):
        if state_id.caract_echange_nouvel_existant == "Nouvel échange":
            # TODO nouvel échange
            # TODO why not commented?
            if kw.get("echange_service_id"):
                _logger.warning(
                    "Why create a new echange when receive a echange"
                    " service id?"
                )
            vals = {}
            if offre_service_id:
                # TODO how this exist if not set ... how when not new!
                # TODO use offre existante
                vals["offre_service"] = offre_service_id
            elif kw.get("offre_service_id"):
                vals["offre_service"] = kw.get("offre_service_id").get("id")
            if demande_service_id:
                vals["demande_service"] = demande_service_id
            elif kw.get("demande_service_id"):
                vals["demande_service"] = kw.get("demande_service_id").get(
                    "id"
                )

            # TODO check date_service UI activated by animation (or by user click)
            # Assume date is in UTC from client
            date_service = kw.get("date_service")
            if date_service:
                date_echange = date_service
                time_service = kw.get("time_service")
                if time_service:
                    date_echange += " " + time_service
                    date_echange_float = datetime.strptime(
                        date_echange, "%Y-%m-%d %H:%M"
                    )
                else:
                    date_echange_float = datetime.strptime(
                        date_echange, "%Y-%m-%d"
                    ).date()
                vals["date_echange"] = date_echange_float

            if kw.get("commentaires"):
                vals["commentaire"] = kw.get("commentaires")

            other_membre_id = None
            if kw.get("membre_id") and "id" in kw.get("membre_id").keys():
                other_membre_id = kw.get("membre_id").get("id")

            vals["type_echange"] = "offre_special"

            membre_id = (
                http.request.env.user.partner_id.accorderie_membre_ids.id
            )
            # if str_state_id in (
            #     "init.saa.recevoir.choix.existant.time.form",
            #     "init.saa.recevoir.choix.nouveau.form",
            #     "init.va.non.recu.choix.form",
            #     "init.va.non.recu.choix.nouveau.form",
            # ):
            if state_id.caract_service_offrir_recevoir == "Service à recevoir":
                # TODO service à recevoir
                # TODO why not init.va.non.recu.choix.form
                vals["membre_acheteur"] = membre_id
                if other_membre_id:
                    vals["membre_vendeur"] = other_membre_id
            elif state_id.caract_service_offrir_recevoir == "Service à offrir":
                vals["membre_vendeur"] = membre_id
                if other_membre_id:
                    vals["membre_acheteur"] = other_membre_id

            # TODO bug time, when not state_id.caract_valider_echange, all time is estimated
            if kw.get("time_service_estimated"):
                vals["nb_heure_estime"] = float(
                    kw.get("time_service_estimated")
                )
            if kw.get("time_realisation_service"):
                vals["nb_heure"] = float(kw.get("time_realisation_service"))
            if kw.get("time_drive_estimated"):
                vals["nb_heure_estime_duree_trajet"] = float(
                    kw.get("time_drive_estimated")
                )
            if kw.get("time_dure_trajet"):
                vals["nb_heure_duree_trajet"] = float(
                    kw.get("time_dure_trajet")
                )

            # Fix client time
            if not state_id.caract_valider_echange:
                if vals.get("nb_heure"):
                    vals["nb_heure_estime"] = vals.get("nb_heure")
                    del vals["nb_heure"]
                if vals.get("nb_heure_duree_trajet"):
                    vals["nb_heure_estime_duree_trajet"] = vals.get(
                        "nb_heure_duree_trajet"
                    )
                    del vals["nb_heure_duree_trajet"]

            if kw.get("frais_trajet"):
                vals["frais_trajet"] = float(kw.get("frais_trajet"))

            if kw.get("distance_trajet"):
                vals["distance_trajet"] = float(kw.get("distance_trajet"))

            if kw.get("frais_materiel"):
                vals["frais_materiel"] = float(kw.get("frais_materiel"))

            # date_echange
            # TODO support private offre/demande and unpublish it
            new_accorderie_echange_service = request.env[
                "accorderie.echange.service"
            ].create(vals)
            status["echange_service_id"] = new_accorderie_echange_service.id

        # if str_state_id in (
        #     "init.va.non.offert.existant.form",
        #     "init.va.non.offert.nouveau.cat.form",
        #     "init.va.oui.form",
        #     "init.va.non.recu.choix.form",
        #     "init.va.non.recu.choix.nouveau.form",
        # ):
        if state_id.caract_valider_echange:
            # TODO valider échange
            if not new_accorderie_echange_service:
                if not kw.get("echange_service_id").get("id"):
                    msg_error = (
                        "Missing argument 'echange_service_id' into"
                        f" '{str_state_id}'"
                    )
                    _logger.error(msg_error)
                    status["error"] = msg_error
                    return status
                new_accorderie_echange_service = (
                    request.env["accorderie.echange.service"]
                    .sudo()
                    .browse(kw.get("echange_service_id").get("id"))
                )
            value_new_service = {
                "transaction_valide": True,
                "nb_heure": float(kw.get("time_realisation_service")),
                "nb_heure_duree_trajet": float(kw.get("time_dure_trajet")),
            }
            if kw.get("frais_trajet"):
                value_new_service["frais_trajet"] = float(
                    kw.get("frais_trajet")
                )
            if kw.get("frais_materiel"):
                value_new_service["frais_materiel"] = float(
                    kw.get("frais_materiel")
                )

            date_service = kw.get("date_service")
            time_service = kw.get("time_service")
            if date_service or time_service:
                date_echange = date_service
                if time_service:
                    date_echange += " " + time_service
                    date_echange_float = datetime.strptime(
                        date_echange, "%Y-%m-%d %H:%M"
                    )
                else:
                    date_echange_float = datetime.strptime(
                        date_echange, "%Y-%m-%d"
                    ).date()
                if (
                    new_accorderie_echange_service.date_echange
                    != date_echange_float
                ):
                    value_new_service["date_echange"] = date_echange_float

            value_new_service["membre_qui_a_valide"] = membre_id
            value_new_service["date_valide"] = fields.Datetime.now()
            new_accorderie_echange_service.write(value_new_service)
            status["echange_service_id"] = new_accorderie_echange_service.id
            # Force update time per member
            # TODO remplacer is_time_updated par la méthode pour forcer la mise à jour du compute
            new_accorderie_echange_service.membre_acheteur.is_time_updated = (
                True
            )
            new_accorderie_echange_service.membre_vendeur.is_time_updated = (
                True
            )
        return status

    @http.route(
        "/accorderie/submit/demande/publish/<model('accorderie.demande.service'):demande_id>",
        type="json",
        auth="user",
        website=True,
        csrf=True,
    )
    def accorderie_demande_publish_submit(self, demande_id, **kw):
        status = {}
        website_published = kw.get("website_published")
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        if demande_id.membre.id != me_membre_id.id:
            status["error"] = (
                "You don't have permission to change publish state of this"
                " demande."
            )
        else:
            demande_id.website_published = website_published
            status["id"] = demande_id
            status["website_published"] = website_published
        return status

    @http.route(
        "/accorderie/submit/demande/supprimer/<model('accorderie.demande.service'):demande_id>",
        type="json",
        auth="user",
        website=True,
        csrf=True,
    )
    def accorderie_demande_supprimer_submit(self, demande_id, **kw):
        status = {}
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        if demande_id.membre.id != me_membre_id.id:
            status[
                "error"
            ] = "You don't have permission to delete this demande."
        else:
            demande_id.active = False
            status["id"] = demande_id
            status["active"] = False
        return status

    @http.route(
        "/accorderie/submit/offre/publish/<model('accorderie.offre.service'):offre_id>",
        type="json",
        auth="user",
        website=True,
        csrf=True,
    )
    def accorderie_offre_publish_submit(self, offre_id, **kw):
        status = {}
        website_published = kw.get("website_published")
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        if offre_id.membre.id != me_membre_id.id:
            status["error"] = (
                "You don't have permission to change publish state of this"
                " offre."
            )
        else:
            offre_id.website_published = website_published
            status["id"] = offre_id
            status["website_published"] = website_published
        return status

    @http.route(
        "/accorderie/submit/offre/supprimer/<model('accorderie.offre.service'):offre_id>",
        type="json",
        auth="user",
        website=True,
        csrf=True,
    )
    def accorderie_offre_supprimer_submit(self, offre_id, **kw):
        status = {}
        me_membre_id = http.request.env.user.partner_id.accorderie_membre_ids
        if offre_id.membre.id != me_membre_id.id:
            status["error"] = "You don't have permission to delete this offre."
        else:
            offre_id.active = False
            status["id"] = offre_id
            status["active"] = False
        return status

    @http.route(
        "/accorderie/submit/my_favorite",
        type="json",
        auth="user",
        website=True,
        csrf=True,
    )
    def accorderie_my_favorite_submit(self, **kw):
        # Send from participer website
        status = {}

        membre_id = http.request.env.user.partner_id.accorderie_membre_ids

        id_record = kw.get("id_record")
        model_name = kw.get("model")

        if not id_record or not model_name:
            return {
                "error": (
                    f"Missing parameter 'id_record' or 'model' for call"
                    f" '/accorderie/submit/my_favorite'."
                )
            }

        if model_name == "accorderie.membre":
            favoris_membre_id = http.request.env["accorderie.membre"].browse(
                id_record
            )
            if favoris_membre_id.id in membre_id.membre_favoris_ids.ids:
                membre_id.write(
                    {"membre_favoris_ids": [(3, favoris_membre_id.id, False)]}
                )
                status["id"] = favoris_membre_id.id
                status["is_favorite"] = False
            else:
                # First, search if relation exist, or create it
                favoris_membre_model_favoris_id = http.request.env[
                    "accorderie.membre.favoris"
                ].search([("membre_id", "=", favoris_membre_id.id)])
                if not favoris_membre_model_favoris_id:
                    membre_id.write(
                        {
                            "membre_favoris_ids": [
                                (0, False, {"membre_id": favoris_membre_id.id})
                            ]
                        }
                    )
                else:
                    membre_id.write(
                        {
                            "membre_favoris_ids": [
                                (4, favoris_membre_id.id, False)
                            ]
                        }
                    )
                status["id"] = favoris_membre_id.id
                status["is_favorite"] = True
        elif model_name == "accorderie.offre.service":
            offre_service_id = http.request.env[
                "accorderie.offre.service"
            ].browse(id_record)
            if membre_id.id in offre_service_id.membre_favoris_ids.ids:
                offre_service_id.write(
                    {"membre_favoris_ids": [(3, membre_id.id, False)]}
                )
                status["id"] = offre_service_id.id
                status["is_favorite"] = False
            else:
                offre_service_id.write(
                    {"membre_favoris_ids": [(4, membre_id.id, False)]}
                )
                status["id"] = offre_service_id.id
                status["is_favorite"] = True
        elif model_name == "accorderie.demande.service":
            demande_service_id = http.request.env[
                "accorderie.demande.service"
            ].browse(id_record)
            if membre_id.id in demande_service_id.membre_favoris_ids.ids:
                demande_service_id.write(
                    {"membre_favoris_ids": [(3, membre_id.id, False)]}
                )
                status["id"] = demande_service_id.id
                status["is_favorite"] = False
            else:
                demande_service_id.write(
                    {"membre_favoris_ids": [(4, membre_id.id, False)]}
                )
                status["id"] = demande_service_id.id
                status["is_favorite"] = True
        else:
            msg_error = (
                f"/accorderie/submit/my_favorite model '{model_name}' not"
                " supported."
            )
            _logger.error(msg_error)
            status["error"] = msg_error

        return status

    @http.route(
        [
            "/accorderie/get_member",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_participer_member_from_accorderie(self, **kw):
        # TODO filter get member from accorderie
        env = request.env(context=dict(request.env.context))
        accorderie_membre_ids = env["accorderie.membre"].sudo().search([])
        return {
            "list": [
                {
                    "text": a.nom,
                    "id": a.id,
                    "img": a.logo_attachment_id.local_url,
                }
                for a in accorderie_membre_ids
            ]
        }

    @http.route(
        [
            "/accorderie/type_service_sous_categorie_list",
            "/accorderie/type_service_sous_categorie_list/<int:categorie_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_type_service_sous_categorie_list(self, categorie_id=None, **kw):
        env = request.env(context=dict(request.env.context))

        accorderie_type_service_sous_categorie_cls = env[
            "accorderie.type.service.sous.categorie"
        ]
        if categorie_id:
            accorderie_type_service_sous_categorie = (
                accorderie_type_service_sous_categorie_cls.sudo().search(
                    [("categorie", "=", categorie_id)]
                )
            )
        else:
            accorderie_type_service_sous_categorie = (
                accorderie_type_service_sous_categorie_cls.sudo().search([])
            )

        dct_value = {
            "type_service_sous_categories": accorderie_type_service_sous_categorie
        }

        # Render page
        return request.env["ir.ui.view"].render_template(
            "website_accorderie.accorderie_type_service_categorie_list_publication_sous_categorie",
            dct_value,
        )

    @http.route(
        [
            "/accorderie/template/votre_contact_full",
        ],
        type="http",
        auth="user",
        website=True,
    )
    def get_template_votre_contact_full(self, **kw):
        # Render page
        return request.env["ir.ui.view"].render_template(
            "website_accorderie.template_votre_contact_full",
        )

    @http.route(
        [
            "/accorderie/template/offre_ou_demande_de_service_generic",
        ],
        type="http",
        auth="user",
        website=True,
    )
    def get_template_offre_ou_demande_de_service_generic(self, **kw):
        # Render page
        return request.env["ir.ui.view"].render_template(
            "website_accorderie.template_offre_ou_demande_de_service_generic",
        )
