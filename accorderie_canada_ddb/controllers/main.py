import base64
import datetime as dt
import logging
import time
import urllib.parse
from collections import defaultdict
from datetime import datetime

import humanize
import requests
import werkzeug

from odoo import _, http
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


class AccorderieCanadaDdbController(http.Controller):
    @http.route(
        [
            "/accorderie_canada_ddb/accorderie_offre_service/<int:offre_service>"
        ],
        type="http",
        auth="public",
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
            "accorderie_canada_ddb.accorderie_offre_service_unit_liste_offre_et_demande_service",
            dct_value,
        )

    @http.route(
        [
            "/accorderie_canada_ddb/get_info/get_offre_service/<model('accorderie.offre.service'):offre_id>",
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
            "is_favorite": me_membre_id.id in offre_id.membre_favoris_ids.ids,
            "distance": "8m",
            "membre_id": offre_id.membre.id,
            "diff_create_date": self._transform_str_diff_time_creation(
                offre_id.create_date
            ),
        }

    @http.route(
        [
            "/accorderie_canada_ddb/get_info/get_demande_service/<model('accorderie.demande.service'):demande_id>",
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
            "is_favorite": me_membre_id.id
            in demande_id.membre_favoris_ids.ids,
            "distance": "8m",
            "membre_id": demande_id.membre.id,
            "diff_create_date": self._transform_str_diff_time_creation(
                demande_id.create_date
            ),
        }

    @http.route(
        [
            "/accorderie_canada_ddb/get_info/get_echange_service/<model('accorderie.echange.service'):echange_id>",
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

        data = {
            "id": echange_id.id,
            "transaction_valide": echange_id.transaction_valide,
            "date": echange_id.date_echange,
            "temps": echange_id.date_echange.hour
            + echange_id.date_echange.minute / 60.0,
            "duree_estime": echange_id.nb_heure_estime,
            "duree": echange_id.nb_heure,
            "duree_trajet_estime": echange_id.nb_heure_estime_duree_trajet,
            "duree_trajet": echange_id.nb_heure_duree_trajet,
            "commentaire": echange_id.commentaire,
        }

        if me_membre_id.id in echange_id.membre_vendeur.ids:
            membre = echange_id.membre_acheteur
            data["estAcheteur"] = False
        else:
            membre = echange_id.membre_vendeur
            data["estAcheteur"] = True

        # data["membre"] = {
        #     "id": membre.id,
        #     "full_name": membre.nom_complet,
        # }
        data["membre_id"] = membre.id

        if echange_id.transaction_valide:
            end_date = echange_id.date_echange + dt.timedelta(
                hours=echange_id.nb_heure
            )
        else:
            end_date = echange_id.date_echange + dt.timedelta(
                hours=echange_id.nb_heure_estime
            )
        data["end_date"] = end_date

        if echange_id.offre_service:
            data["offre_service"] = echange_id.offre_service.id
            # data["description_service"] = echange_id.offre_service.titre
        if echange_id.demande_service:
            data["demande_service"] = echange_id.demande_service.id
            # data["description_service"] = echange_id.demande_service.titre
        return data

    @http.route(
        [
            "/accorderie_canada_ddb/accorderie_demande_service/<int:demande_service>"
        ],
        type="http",
        auth="public",
        website=True,
    )
    def get_page_demande_service(self, demande_service=None, **kw):
        env = request.env(context=dict(request.env.context))

        accorderie_demande_service_cls = env["accorderie.demande.service"]
        if demande_service:
            accorderie_demande_service_id = (
                accorderie_demande_service_cls.sudo()
                .browse(demande_service)
                .exists()
            )
            str_diff_time = self._transform_str_diff_time_creation(
                accorderie_demande_service_id.create_date
            )
            if (
                accorderie_demande_service_id
                and accorderie_demande_service_id.membre
            ):
                str_distance = find_distance_from_user(
                    env, accorderie_demande_service_id.membre.adresse
                )
        else:
            accorderie_demande_service_id = None
        dct_value = {
            "accorderie_demande_service_id": accorderie_demande_service_id,
            "str_diff_time": str_diff_time,
            "str_distance": str_distance,
        }

        # Render page
        return request.render(
            "accorderie_canada_ddb.accorderie_demande_service_unit_liste_offre_et_demande_service",
            dct_value,
        )

    @http.route(
        [
            "/accorderie_canada_ddb/offre_service_accorderie_offre_service_and_demande_service_accorderie_demande_service_list"
        ],
        type="json",
        auth="public",
        website=True,
    )
    def get_offre_service_accorderie_offre_service_and_demande_service_accorderie_demande_service_list(
        self, **kw
    ):
        env = request.env(context=dict(request.env.context))

        accorderie_offre_service_cls = env["accorderie.offre.service"]
        accorderie_offre_service_ids = (
            accorderie_offre_service_cls.sudo()
            .search([], order="create_date desc", limit=3)
            .ids
        )
        offre_services = accorderie_offre_service_cls.sudo().browse(
            accorderie_offre_service_ids
        )
        offre_services_count = (
            accorderie_offre_service_cls.sudo().search_count([])
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
            .search([], order="create_date desc", limit=3)
            .ids
        )
        demande_services = accorderie_demande_service_cls.sudo().browse(
            accorderie_demande_service_ids
        )
        demande_services_count = (
            accorderie_demande_service_cls.sudo().search_count([])
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
            "accorderie_canada_ddb.accorderie_offre_service_and_accorderie_demande_service_list_liste_offre_et_demande_service",
            dct_value,
        )

    @http.route(
        [
            "/accorderie_canada_ddb/type_service_categorie/<int:type_service_categorie>"
        ],
        type="http",
        auth="public",
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
            "accorderie_canada_ddb.accorderie_type_service_categorie_unit_liste_type_service_categorie",
            dct_value,
        )

    @http.route(
        ["/accorderie_canada_ddb/type_service_categorie_list"],
        type="json",
        auth="public",
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
            "accorderie_canada_ddb.accorderie_type_service_categorie_list_liste_type_service_categorie",
            dct_value,
        )

    @http.route(
        ["/participer"],
        type="http",
        auth="public",
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
            "accorderie_canada_ddb.accorderie_type_service_categorie_list_publication",
            dct_value,
        )

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

        membre_id = partner_id.accorderie_membre_ids

        if not membre_id:
            return {
                "error": _(
                    "Your account is not associate to an accorderie"
                    " configuration. Please contact your administrator."
                )
            }
        return membre_id

    @http.route(
        [
            "/accorderie_canada_ddb/get_personal_information",
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
                "is_favorite": membre_id.id in a.membre_favoris_ids.ids,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom_complet,
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
                    "full_name": a.membre.nom_complet,
                },
                "distance": "8m",
            }
            for a in http.request.env["accorderie.offre.service"].search(
                [("membre_favoris_ids", "=", membre_id.id)]
            )
        }

        dct_demande_service = {
            a.id: {
                "id": a.id,
                "description": a.description,
                "titre": a.titre,
                "is_favorite": membre_id.id in a.membre_favoris_ids.ids,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom_complet,
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
                    "full_name": a.membre.nom_complet,
                },
                "distance": "8m",
            }
            for a in http.request.env["accorderie.demande.service"].search(
                [("membre_favoris_ids", "=", membre_id.id)]
            )
        }

        dct_membre_favoris = {
            a.membre_id.id: {
                "id": a.membre_id.id,
                "description": a.membre_id.introduction,
                "age": 35,
                "is_favorite": True,
                "full_name": a.membre_id.nom_complet,
                "distance": "8m",
            }
            for a in membre_id.membre_favoris_ids
        }

        is_favorite = membre_id.id in [
            a.membre_id.id for a in membre_id.membre_favoris_ids
        ]

        dct_echange = {}
        for echange_service_id in membre_id.echange_service_acheteur_ids:
            if echange_service_id.transaction_valide:
                end_date = echange_service_id.date_echange + dt.timedelta(
                    hours=echange_service_id.nb_heure
                )
            else:
                end_date = echange_service_id.date_echange + dt.timedelta(
                    hours=echange_service_id.nb_heure_estime
                )
            dct_echange_item = {
                "id": echange_service_id.id,
                "transaction_valide": echange_service_id.transaction_valide,
                "membre": {
                    "id": echange_service_id.membre_vendeur.id,
                    "full_name": echange_service_id.membre_vendeur.nom_complet,
                },
                "description_service": echange_service_id.offre_service.titre,
                "date": echange_service_id.date_echange,
                "end_date": end_date,
                "temps": echange_service_id.date_echange.hour
                + echange_service_id.date_echange.minute / 60.0,
                "duree_estime": echange_service_id.nb_heure_estime,
                "duree": echange_service_id.nb_heure,
                "estAcheteur": True,
            }
            dct_echange[echange_service_id.id] = dct_echange_item
        for echange_service_id in membre_id.echange_service_vendeur_ids:
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
                    "id": echange_service_id.membre_acheteur.id,
                    "full_name": echange_service_id.membre_acheteur.nom_complet,
                },
                "description_service": echange_service_id.demande_service.titre,
                "date": date_echange,
                "end_date": end_date,
                "temps": date_echange.hour + date_echange.minute / 60.0,
                "duree_estime": echange_service_id.nb_heure_estime,
                "duree": echange_service_id.nb_heure,
                "estAcheteur": False,
            }
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
        return {
            "global": {
                "dbname": http.request.env.cr.dbname,
            },
            "personal": {
                "id": membre_id.id,
                "full_name": membre_id.nom_complet,
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

    @http.route(
        [
            "/accorderie_canada_ddb/get_membre_information/<model('accorderie.membre'):membre_id>",
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
                "is_favorite": me_membre_id.id in a.membre_favoris_ids.ids,
                "diff_create_date": self._transform_str_diff_time_creation(
                    a.create_date
                ),
                "membre": {
                    "id": a.membre.id,
                    "full_name": a.membre.nom_complet,
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
                    "full_name": a.membre.nom_complet,
                },
                "distance": "8m",
            }
            for a in membre_id.demande_service_ids
        }

        is_favorite = membre_id.id in [
            a.membre_id.id for a in actual_membre_id.membre_favoris_ids
        ]

        return {
            "membre_info": {
                "id": membre_id.id,
                "full_name": membre_id.nom_complet,
                "prenom": membre_id.prenom,
                "bank_max_service_offert": membre_id.bank_max_service_offert,
                "actual_bank_hours": membre_id.bank_time,
                "actual_month_bank_hours": membre_id.bank_month_time,
                "is_favorite": is_favorite,
                "introduction": membre_id.introduction,
                "diff_humain_creation_membre": str_diff_time_creation,
                "date_creation": membre_id.create_date,
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
            "/accorderie_canada_ddb/get_info/offre_service/<model('accorderie.membre'):membre_id>",
        ],
        type="json",
        auth="public",
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
            "/accorderie_canada_ddb/get_info/list_membre",
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
                "full_name": a.nom_complet,
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
            "/accorderie_canada_ddb/get_info/nb_offre_service",
        ],
        type="json",
        auth="public",
        website=True,
    )
    def get_nb_offre_service(self, **kw):
        nb_offre_service = (
            http.request.env["accorderie.offre.service"]
            .sudo()
            .search_count([])
        )
        return {"nb_offre_service": nb_offre_service}

    @http.route(
        [
            "/accorderie_canada_ddb/get_info/echange_service/<model('accorderie.membre'):membre_id>",
        ],
        type="json",
        auth="user",
        website=True,
    )
    def get_participer_workflow_data_echange_service(self, membre_id, **kw):
        me_membre_id = self.get_membre_id()
        if type(me_membre_id) is dict:
            # This is an error
            return me_membre_id

        lst_mes_echanges_de_service_recu_sans_demande_non_valide = [
            {
                "id": a.id,
                "right_html": a.create_date,
                "title": a.titre,
            }
            for a in me_membre_id.echange_service_acheteur_ids
            if not a.transaction_valide
            and not a.demande_service
            and a.membre_vendeur.id == membre_id.id
        ]

        return {
            "data": {
                "mes_echanges_de_service_recu_sans_demande_non_valide": lst_mes_echanges_de_service_recu_sans_demande_non_valide
            }
        }

    @http.route(
        [
            "/accorderie_canada_ddb/get_info/recevoir_service/<model('accorderie.membre'):membre_id>",
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
                "right_html": a.create_date,
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
            "/accorderie_canada_ddb/get_participer_workflow_data",
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
                "title": a.nom_complet,
                "id": a.id,
                "img": "/web/image/accorderie_canada_ddb_website.ir_attachment_henrique_castilho_l8kmx3rzt7s_unsplash_jpg/henrique-castilho-L8kMx3rzt7s-unsplash.jpg",
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

        # lst_mes_echanges_de_service_avec_demande_non_valide
        lst_echange_acheteur = [
            {
                "id": a.id,
                "html": f"Par {a.membre_vendeur.nom_complet}",
                "right_html": a.create_date,
                "title": a.titre,
            }
            for a in membre_id.echange_service_acheteur_ids
            if not a.transaction_valide
            and (a.demande_service or a.offre_service)
        ]

        lst_echange_vendeur = [
            {
                "id": a.id,
                "html": f"Pour {a.membre_acheteur.nom_complet}",
                "right_html": a.create_date,
                "title": a.titre,
            }
            for a in membre_id.echange_service_vendeur_ids
            if not a.transaction_valide
            and (a.demande_service or a.offre_service)
        ]

        # TODO order by time
        lst_mes_echanges_de_service_avec_demande_non_valide = (
            lst_echange_acheteur + lst_echange_vendeur
        )

        # lst_mes_echanges_de_service_offert_sans_demande_non_valide
        lst_mes_echanges_de_service_offert_sans_demande_non_valide = [
            {
                "id": a.id,
                "right_html": a.create_date,
                "title": a.titre,
            }
            for a in membre_id.echange_service_vendeur_ids
            if not a.transaction_valide and not a.demande_service
        ]

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
                "mes_echanges_de_service_avec_demande_non_valide": lst_mes_echanges_de_service_avec_demande_non_valide,
                "mes_echanges_de_service_offert_sans_demande_non_valide": lst_mes_echanges_de_service_offert_sans_demande_non_valide,
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
                    dct_state["model_field_depend"] = state_id.model_field_depend
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
        state_id = kw.get("state_id")
        demande_service_id = None
        offre_service_id = None
        new_accorderie_echange_service = None

        if state_id in (
            "init.pos.individuelle.formulaire",
            "init.pds.individuelle.formulaire",
            "init.saa.offrir.nouveau.categorie_service.formulaire",
            "init.saa.offrir.nouveau.categorie_service.formulaire",
            "init.saa.recevoir.choix.nouveau.formulaire",
            "init.va.non.offert.nouveau_formulaire",
            "init.va.non.recu.choix.nouveau.formulaire",
        ):
            if kw.get("offre_service_id"):
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

                membre_id = (
                    http.request.env.user.partner_id.accorderie_membre_ids.id
                )
                vals["membre"] = membre_id

                if state_id in (
                    "init.pds.individuelle.formulaire",
                    "init.saa.recevoir.choix.nouveau.formulaire",
                    "init.va.non.recu.choix.nouveau.formulaire",
                ):
                    new_accorderie_service = (
                        request.env["accorderie.demande.service"]
                        .sudo()
                        .create(vals)
                    )
                    demande_service_id = new_accorderie_service.id
                    status["demande_service_id"] = demande_service_id
                else:
                    new_accorderie_service = (
                        request.env["accorderie.offre.service"]
                        .sudo()
                        .create(vals)
                    )
                    offre_service_id = new_accorderie_service.id
                    status["offre_service_id"] = offre_service_id

        if state_id in (
            "init.saa.offrir.nouveau.categorie_service.formulaire",
            "init.saa.offrir.existant.formulaire",
            "init.saa.recevoir.choix.existant.time.formulaire",
            "init.saa.offrir.nouveau.categorie_service.formulaire",
            "init.saa.recevoir.choix.nouveau.formulaire",
            "init.va.non.offert.nouveau_formulaire",
            "init.va.non.offert.existant_formulaire",
            "init.va.non.recu.choix.formulaire",
            "init.va.non.recu.choix.nouveau.formulaire",
        ):
            vals = {}
            if offre_service_id:
                vals["offre_service"] = offre_service_id
            elif kw.get("offre_service_id"):
                vals["offre_service"] = kw.get("offre_service_id").get("id")

            if kw.get("date_service"):
                date_echange = kw.get("date_service")
                if kw.get("time_service"):
                    date_echange += " " + kw.get("time_service")
                    # TODO Take date from local of user
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

            if kw.get("membre_id") and "id" in kw.get("membre_id").keys():
                membre_id_acheteur_id = kw.get("membre_id").get("id")
                vals["membre_acheteur"] = membre_id_acheteur_id

            vals["type_echange"] = "offre_special"

            membre_id = (
                http.request.env.user.partner_id.accorderie_membre_ids.id
            )
            if state_id in (
                "init.saa.recevoir.choix.existant.time.formulaire",
                "init.saa.recevoir.choix.nouveau.formulaire",
                "init.va.non.recu.choix.formulaire",
                "init.va.non.recu.choix.nouveau.formulaire",
            ):
                vals["membre_acheteur"] = membre_id
            else:
                vals["membre_vendeur"] = membre_id

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
            # date_echange
            new_accorderie_echange_service = (
                request.env["accorderie.echange.service"].sudo().create(vals)
            )
            status["echange_service_id"] = new_accorderie_echange_service.id

        if state_id in (
            "init.va.non.offert.existant_formulaire",
            "init.va.non.offert.nouveau_formulaire",
            "init.va.oui.formulaire",
            "init.va.non.recu.choix.formulaire",
            "init.va.non.recu.choix.nouveau.formulaire",
        ):
            if not new_accorderie_echange_service:
                if not kw.get("echange_service_id").get("id"):
                    msg_error = (
                        "Missing argument 'echange_service_id' into"
                        f" '{state_id}'"
                    )
                    _logger.error(msg_error)
                    status["error"] = msg_error
                    return status
                new_accorderie_echange_service = (
                    request.env["accorderie.echange.service"]
                    .sudo()
                    .browse(kw.get("echange_service_id").get("id"))
                )
            new_accorderie_echange_service.write(
                {
                    "transaction_valide": True,
                    "nb_heure": float(kw.get("time_realisation_service")),
                }
            )
            status["echange_service_id"] = new_accorderie_echange_service.id
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
            "/accorderie_canada_ddb/get_member",
        ],
        type="json",
        auth="public",
        website=True,
    )
    def get_participer_member_from_accorderie(self, **kw):
        # TODO filter get member from accorderie
        env = request.env(context=dict(request.env.context))
        accorderie_membre_ids = env["accorderie.membre"].sudo().search([])
        return {
            "list": [
                {
                    "text": a.nom_complet,
                    "id": a.id,
                    "img": "/web/image/accorderie_canada_ddb_website.ir_attachment_henrique_castilho_l8kmx3rzt7s_unsplash_jpg/henrique-castilho-L8kMx3rzt7s-unsplash.jpg",
                }
                for a in accorderie_membre_ids
            ]
        }

    @http.route(
        [
            "/accorderie_canada_ddb/type_service_sous_categorie_list",
            "/accorderie_canada_ddb/type_service_sous_categorie_list/<int:categorie_id>",
        ],
        type="json",
        auth="public",
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
            "accorderie_canada_ddb.accorderie_type_service_categorie_list_publication_sous_categorie",
            dct_value,
        )

    @http.route(
        [
            "/accorderie_canada_ddb/template/votre_contact_full",
        ],
        type="http",
        auth="public",
        website=True,
    )
    def get_template_votre_contact_full(self, **kw):
        # Render page
        return request.env["ir.ui.view"].render_template(
            "accorderie_canada_ddb.template_votre_contact_full",
        )

    @http.route(
        "/new/accorderie_accorderie", type="http", auth="user", website=True
    )
    def create_new_accorderie_accorderie(self, **kw):
        default_active = (
            http.request.env["accorderie.accorderie"]
            .default_get(["active"])
            .get("active")
        )
        default_adresse = (
            http.request.env["accorderie.accorderie"]
            .default_get(["adresse"])
            .get("adresse")
        )
        arrondissement = http.request.env["accorderie.arrondissement"].search(
            []
        )
        default_arrondissement = (
            http.request.env["accorderie.accorderie"]
            .default_get(["arrondissement"])
            .get("arrondissement")
        )
        default_code_postal = (
            http.request.env["accorderie.accorderie"]
            .default_get(["code_postal"])
            .get("code_postal")
        )
        default_courriel = (
            http.request.env["accorderie.accorderie"]
            .default_get(["courriel"])
            .get("courriel")
        )
        default_date_mise_a_jour = (
            http.request.env["accorderie.accorderie"]
            .default_get(["date_mise_a_jour"])
            .get("date_mise_a_jour")
        )
        default_grp_achat_administrateur = (
            http.request.env["accorderie.accorderie"]
            .default_get(["grp_achat_administrateur"])
            .get("grp_achat_administrateur")
        )
        default_grp_achat_membre = (
            http.request.env["accorderie.accorderie"]
            .default_get(["grp_achat_membre"])
            .get("grp_achat_membre")
        )
        default_message_accueil = (
            http.request.env["accorderie.accorderie"]
            .default_get(["message_accueil"])
            .get("message_accueil")
        )
        default_message_grp_achat = (
            http.request.env["accorderie.accorderie"]
            .default_get(["message_grp_achat"])
            .get("message_grp_achat")
        )
        default_nom = (
            http.request.env["accorderie.accorderie"]
            .default_get(["nom"])
            .get("nom")
        )
        region = http.request.env["accorderie.region"].search([])
        default_region = (
            http.request.env["accorderie.accorderie"]
            .default_get(["region"])
            .get("region")
        )
        default_telecopieur = (
            http.request.env["accorderie.accorderie"]
            .default_get(["telecopieur"])
            .get("telecopieur")
        )
        default_telephone = (
            http.request.env["accorderie.accorderie"]
            .default_get(["telephone"])
            .get("telephone")
        )
        default_url_public = (
            http.request.env["accorderie.accorderie"]
            .default_get(["url_public"])
            .get("url_public")
        )
        default_url_transactionnel = (
            http.request.env["accorderie.accorderie"]
            .default_get(["url_transactionnel"])
            .get("url_transactionnel")
        )
        ville = http.request.env["accorderie.ville"].search([])
        default_ville = (
            http.request.env["accorderie.accorderie"]
            .default_get(["ville"])
            .get("ville")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_accorderie",
            {
                "arrondissement": arrondissement,
                "region": region,
                "ville": ville,
                "page_name": "create_accorderie_accorderie",
                "default_active": default_active,
                "default_adresse": default_adresse,
                "default_arrondissement": default_arrondissement,
                "default_code_postal": default_code_postal,
                "default_courriel": default_courriel,
                "default_date_mise_a_jour": default_date_mise_a_jour,
                "default_grp_achat_administrateur": default_grp_achat_administrateur,
                "default_grp_achat_membre": default_grp_achat_membre,
                "default_message_accueil": default_message_accueil,
                "default_message_grp_achat": default_message_grp_achat,
                "default_nom": default_nom,
                "default_region": default_region,
                "default_telecopieur": default_telecopieur,
                "default_telephone": default_telephone,
                "default_url_public": default_url_public,
                "default_url_transactionnel": default_url_transactionnel,
                "default_ville": default_ville,
            },
        )

    @http.route(
        "/submitted/accorderie_accorderie",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_accorderie(self, **kw):
        vals = {}

        default_active = (
            http.request.env["accorderie.accorderie"]
            .default_get(["active"])
            .get("active")
        )
        if kw.get("active"):
            vals["active"] = kw.get("active") == "True"
        elif default_active:
            vals["active"] = False

        if kw.get("adresse"):
            vals["adresse"] = kw.get("adresse")

        if kw.get("arrondissement") and kw.get("arrondissement").isdigit():
            vals["arrondissement"] = int(kw.get("arrondissement"))

        if kw.get("code_postal"):
            vals["code_postal"] = kw.get("code_postal")

        if kw.get("courriel"):
            vals["courriel"] = kw.get("courriel")

        if kw.get("date_mise_a_jour"):
            vals["date_mise_a_jour"] = kw.get("date_mise_a_jour")

        default_grp_achat_administrateur = (
            http.request.env["accorderie.accorderie"]
            .default_get(["grp_achat_administrateur"])
            .get("grp_achat_administrateur")
        )
        if kw.get("grp_achat_administrateur"):
            vals["grp_achat_administrateur"] = (
                kw.get("grp_achat_administrateur") == "True"
            )
        elif default_grp_achat_administrateur:
            vals["grp_achat_administrateur"] = False

        default_grp_achat_membre = (
            http.request.env["accorderie.accorderie"]
            .default_get(["grp_achat_membre"])
            .get("grp_achat_membre")
        )
        if kw.get("grp_achat_membre"):
            vals["grp_achat_membre"] = kw.get("grp_achat_membre") == "True"
        elif default_grp_achat_membre:
            vals["grp_achat_membre"] = False

        if kw.get("logo"):
            lst_file_logo = request.httprequest.files.getlist("logo")
            if lst_file_logo:
                vals["logo"] = base64.b64encode(lst_file_logo[-1].read())

        if kw.get("message_accueil"):
            vals["message_accueil"] = kw.get("message_accueil")

        if kw.get("message_grp_achat"):
            vals["message_grp_achat"] = kw.get("message_grp_achat")

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        if kw.get("region") and kw.get("region").isdigit():
            vals["region"] = int(kw.get("region"))

        if kw.get("telecopieur"):
            vals["telecopieur"] = kw.get("telecopieur")

        if kw.get("telephone"):
            vals["telephone"] = kw.get("telephone")

        if kw.get("url_public"):
            vals["url_public"] = kw.get("url_public")

        if kw.get("url_transactionnel"):
            vals["url_transactionnel"] = kw.get("url_transactionnel")

        if kw.get("ville") and kw.get("ville").isdigit():
            vals["ville"] = int(kw.get("ville"))

        new_accorderie_accorderie = (
            request.env["accorderie.accorderie"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_accorderie/{new_accorderie_accorderie.id}"
        )

    @http.route(
        "/new/accorderie_arrondissement",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_arrondissement(self, **kw):
        default_nom = (
            http.request.env["accorderie.arrondissement"]
            .default_get(["nom"])
            .get("nom")
        )
        ville = http.request.env["accorderie.ville"].search([])
        default_ville = (
            http.request.env["accorderie.arrondissement"]
            .default_get(["ville"])
            .get("ville")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_arrondissement",
            {
                "ville": ville,
                "page_name": "create_accorderie_arrondissement",
                "default_nom": default_nom,
                "default_ville": default_ville,
            },
        )

    @http.route(
        "/submitted/accorderie_arrondissement",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_arrondissement(self, **kw):
        vals = {}

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        if kw.get("ville") and kw.get("ville").isdigit():
            vals["ville"] = int(kw.get("ville"))

        new_accorderie_arrondissement = (
            request.env["accorderie.arrondissement"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_arrondissement/{new_accorderie_arrondissement.id}"
        )

    @http.route(
        "/new/accorderie_commentaire", type="http", auth="user", website=True
    )
    def create_new_accorderie_commentaire(self, **kw):
        default_autre_commentaire = (
            http.request.env["accorderie.commentaire"]
            .default_get(["autre_commentaire"])
            .get("autre_commentaire")
        )
        default_autre_situation = (
            http.request.env["accorderie.commentaire"]
            .default_get(["autre_situation"])
            .get("autre_situation")
        )
        confidentiel = (
            http.request.env["accorderie.commentaire"]
            ._fields["confidentiel"]
            .selection
        )
        default_confidentiel = (
            http.request.env["accorderie.commentaire"]
            .default_get(["confidentiel"])
            .get("confidentiel")
        )
        default_consulter_accorderie = (
            http.request.env["accorderie.commentaire"]
            .default_get(["consulter_accorderie"])
            .get("consulter_accorderie")
        )
        default_consulter_reseau = (
            http.request.env["accorderie.commentaire"]
            .default_get(["consulter_reseau"])
            .get("consulter_reseau")
        )
        default_date_incident = (
            http.request.env["accorderie.commentaire"]
            .default_get(["date_incident"])
            .get("date_incident")
        )
        default_date_mise_a_jour = (
            http.request.env["accorderie.commentaire"]
            .default_get(["date_mise_a_jour"])
            .get("date_mise_a_jour")
        )
        default_datetime_creation = (
            http.request.env["accorderie.commentaire"]
            .default_get(["datetime_creation"])
            .get("datetime_creation")
        )
        degre_satisfaction = (
            http.request.env["accorderie.commentaire"]
            ._fields["degre_satisfaction"]
            .selection
        )
        default_degre_satisfaction = (
            http.request.env["accorderie.commentaire"]
            .default_get(["degre_satisfaction"])
            .get("degre_satisfaction")
        )
        demande_service_id = http.request.env[
            "accorderie.demande.service"
        ].search([("active", "=", True)])
        default_demande_service_id = (
            http.request.env["accorderie.commentaire"]
            .default_get(["demande_service_id"])
            .get("demande_service_id")
        )
        default_demarche = (
            http.request.env["accorderie.commentaire"]
            .default_get(["demarche"])
            .get("demarche")
        )
        membre_source = http.request.env["accorderie.membre"].search(
            [("active", "=", True)]
        )
        default_membre_source = (
            http.request.env["accorderie.commentaire"]
            .default_get(["membre_source"])
            .get("membre_source")
        )
        membre_viser = http.request.env["accorderie.membre"].search(
            [("active", "=", True)]
        )
        default_membre_viser = (
            http.request.env["accorderie.commentaire"]
            .default_get(["membre_viser"])
            .get("membre_viser")
        )
        default_nom_comite = (
            http.request.env["accorderie.commentaire"]
            .default_get(["nom_comite"])
            .get("nom_comite")
        )
        default_nom_complet = (
            http.request.env["accorderie.commentaire"]
            .default_get(["nom_complet"])
            .get("nom_complet")
        )
        default_note_administrative = (
            http.request.env["accorderie.commentaire"]
            .default_get(["note_administrative"])
            .get("note_administrative")
        )
        default_number = (
            http.request.env["accorderie.commentaire"]
            .default_get(["number"])
            .get("number")
        )
        offre_service_id = http.request.env["accorderie.offre.service"].search(
            [("active", "=", True)]
        )
        default_offre_service_id = (
            http.request.env["accorderie.commentaire"]
            .default_get(["offre_service_id"])
            .get("offre_service_id")
        )
        point_service = http.request.env["accorderie.point.service"].search([])
        default_point_service = (
            http.request.env["accorderie.commentaire"]
            .default_get(["point_service"])
            .get("point_service")
        )
        default_resumer_situation = (
            http.request.env["accorderie.commentaire"]
            .default_get(["resumer_situation"])
            .get("resumer_situation")
        )
        situation_impliquant = (
            http.request.env["accorderie.commentaire"]
            ._fields["situation_impliquant"]
            .selection
        )
        default_situation_impliquant = (
            http.request.env["accorderie.commentaire"]
            .default_get(["situation_impliquant"])
            .get("situation_impliquant")
        )
        default_solution_pour_regler = (
            http.request.env["accorderie.commentaire"]
            .default_get(["solution_pour_regler"])
            .get("solution_pour_regler")
        )
        type_offre = (
            http.request.env["accorderie.commentaire"]
            ._fields["type_offre"]
            .selection
        )
        default_type_offre = (
            http.request.env["accorderie.commentaire"]
            .default_get(["type_offre"])
            .get("type_offre")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_commentaire",
            {
                "confidentiel": confidentiel,
                "degre_satisfaction": degre_satisfaction,
                "demande_service_id": demande_service_id,
                "membre_source": membre_source,
                "membre_viser": membre_viser,
                "offre_service_id": offre_service_id,
                "point_service": point_service,
                "situation_impliquant": situation_impliquant,
                "type_offre": type_offre,
                "page_name": "create_accorderie_commentaire",
                "default_autre_commentaire": default_autre_commentaire,
                "default_autre_situation": default_autre_situation,
                "default_confidentiel": default_confidentiel,
                "default_consulter_accorderie": default_consulter_accorderie,
                "default_consulter_reseau": default_consulter_reseau,
                "default_date_incident": default_date_incident,
                "default_date_mise_a_jour": default_date_mise_a_jour,
                "default_datetime_creation": default_datetime_creation,
                "default_degre_satisfaction": default_degre_satisfaction,
                "default_demande_service_id": default_demande_service_id,
                "default_demarche": default_demarche,
                "default_membre_source": default_membre_source,
                "default_membre_viser": default_membre_viser,
                "default_nom_comite": default_nom_comite,
                "default_nom_complet": default_nom_complet,
                "default_note_administrative": default_note_administrative,
                "default_number": default_number,
                "default_offre_service_id": default_offre_service_id,
                "default_point_service": default_point_service,
                "default_resumer_situation": default_resumer_situation,
                "default_situation_impliquant": default_situation_impliquant,
                "default_solution_pour_regler": default_solution_pour_regler,
                "default_type_offre": default_type_offre,
            },
        )

    @http.route(
        "/submitted/accorderie_commentaire",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_commentaire(self, **kw):
        vals = {}

        if kw.get("autre_commentaire"):
            vals["autre_commentaire"] = kw.get("autre_commentaire")

        if kw.get("autre_situation"):
            vals["autre_situation"] = kw.get("autre_situation")

        default_consulter_accorderie = (
            http.request.env["accorderie.commentaire"]
            .default_get(["consulter_accorderie"])
            .get("consulter_accorderie")
        )
        if kw.get("consulter_accorderie"):
            vals["consulter_accorderie"] = (
                kw.get("consulter_accorderie") == "True"
            )
        elif default_consulter_accorderie:
            vals["consulter_accorderie"] = False

        default_consulter_reseau = (
            http.request.env["accorderie.commentaire"]
            .default_get(["consulter_reseau"])
            .get("consulter_reseau")
        )
        if kw.get("consulter_reseau"):
            vals["consulter_reseau"] = kw.get("consulter_reseau") == "True"
        elif default_consulter_reseau:
            vals["consulter_reseau"] = False

        if kw.get("date_incident"):
            vals["date_incident"] = kw.get("date_incident")

        if kw.get("date_mise_a_jour"):
            vals["date_mise_a_jour"] = kw.get("date_mise_a_jour")

        if kw.get("datetime_creation"):
            vals["datetime_creation"] = kw.get("datetime_creation")

        if (
            kw.get("demande_service_id")
            and kw.get("demande_service_id").isdigit()
        ):
            vals["demande_service_id"] = int(kw.get("demande_service_id"))

        if kw.get("demarche"):
            vals["demarche"] = kw.get("demarche")

        if kw.get("membre_source") and kw.get("membre_source").isdigit():
            vals["membre_source"] = int(kw.get("membre_source"))

        if kw.get("membre_viser") and kw.get("membre_viser").isdigit():
            vals["membre_viser"] = int(kw.get("membre_viser"))

        if kw.get("nom_comite"):
            vals["nom_comite"] = kw.get("nom_comite")

        if kw.get("nom_complet"):
            vals["nom_complet"] = kw.get("nom_complet")

        if kw.get("note_administrative"):
            vals["note_administrative"] = kw.get("note_administrative")

        if kw.get("number"):
            number_value = kw.get("number")
            if number_value.isdigit():
                vals["number"] = int(number_value)

        if kw.get("offre_service_id") and kw.get("offre_service_id").isdigit():
            vals["offre_service_id"] = int(kw.get("offre_service_id"))

        if kw.get("point_service") and kw.get("point_service").isdigit():
            vals["point_service"] = int(kw.get("point_service"))

        if kw.get("resumer_situation"):
            vals["resumer_situation"] = kw.get("resumer_situation")

        if kw.get("solution_pour_regler"):
            vals["solution_pour_regler"] = kw.get("solution_pour_regler")

        new_accorderie_commentaire = (
            request.env["accorderie.commentaire"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_commentaire/{new_accorderie_commentaire.id}"
        )

    @http.route(
        "/new/accorderie_demande_adhesion",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_demande_adhesion(self, **kw):
        accorderie = http.request.env["accorderie.accorderie"].search(
            [("active", "=", True)]
        )
        default_accorderie = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["accorderie"])
            .get("accorderie")
        )
        default_active = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["active"])
            .get("active")
        )
        default_courriel = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["courriel"])
            .get("courriel")
        )
        default_date_mise_a_jour = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["date_mise_a_jour"])
            .get("date_mise_a_jour")
        )
        default_en_attente = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["en_attente"])
            .get("en_attente")
        )
        default_nom = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["nom"])
            .get("nom")
        )
        default_nom_complet = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["nom_complet"])
            .get("nom_complet")
        )
        default_poste = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["poste"])
            .get("poste")
        )
        default_prenom = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["prenom"])
            .get("prenom")
        )
        default_telephone = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["telephone"])
            .get("telephone")
        )
        default_transferer = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["transferer"])
            .get("transferer")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_demande_adhesion",
            {
                "accorderie": accorderie,
                "page_name": "create_accorderie_demande_adhesion",
                "default_accorderie": default_accorderie,
                "default_active": default_active,
                "default_courriel": default_courriel,
                "default_date_mise_a_jour": default_date_mise_a_jour,
                "default_en_attente": default_en_attente,
                "default_nom": default_nom,
                "default_nom_complet": default_nom_complet,
                "default_poste": default_poste,
                "default_prenom": default_prenom,
                "default_telephone": default_telephone,
                "default_transferer": default_transferer,
            },
        )

    @http.route(
        "/submitted/accorderie_demande_adhesion",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_demande_adhesion(self, **kw):
        vals = {}

        if kw.get("accorderie") and kw.get("accorderie").isdigit():
            vals["accorderie"] = int(kw.get("accorderie"))

        default_active = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["active"])
            .get("active")
        )
        if kw.get("active"):
            vals["active"] = kw.get("active") == "True"
        elif default_active:
            vals["active"] = False

        if kw.get("courriel"):
            vals["courriel"] = kw.get("courriel")

        if kw.get("date_mise_a_jour"):
            vals["date_mise_a_jour"] = kw.get("date_mise_a_jour")

        default_en_attente = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["en_attente"])
            .get("en_attente")
        )
        if kw.get("en_attente"):
            vals["en_attente"] = kw.get("en_attente") == "True"
        elif default_en_attente:
            vals["en_attente"] = False

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        if kw.get("nom_complet"):
            vals["nom_complet"] = kw.get("nom_complet")

        if kw.get("poste"):
            vals["poste"] = kw.get("poste")

        if kw.get("prenom"):
            vals["prenom"] = kw.get("prenom")

        if kw.get("telephone"):
            vals["telephone"] = kw.get("telephone")

        default_transferer = (
            http.request.env["accorderie.demande.adhesion"]
            .default_get(["transferer"])
            .get("transferer")
        )
        if kw.get("transferer"):
            vals["transferer"] = kw.get("transferer") == "True"
        elif default_transferer:
            vals["transferer"] = False

        new_accorderie_demande_adhesion = (
            request.env["accorderie.demande.adhesion"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_demande_adhesion/{new_accorderie_demande_adhesion.id}"
        )

    @http.route(
        "/new/accorderie_demande_service",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_demande_service(self, **kw):
        accorderie = http.request.env["accorderie.accorderie"].search(
            [("active", "=", True)]
        )
        default_accorderie = (
            http.request.env["accorderie.demande.service"]
            .default_get(["accorderie"])
            .get("accorderie")
        )
        default_active = (
            http.request.env["accorderie.demande.service"]
            .default_get(["active"])
            .get("active")
        )
        default_approuver = (
            http.request.env["accorderie.demande.service"]
            .default_get(["approuver"])
            .get("approuver")
        )
        default_date_debut = (
            http.request.env["accorderie.demande.service"]
            .default_get(["date_debut"])
            .get("date_debut")
        )
        default_date_fin = (
            http.request.env["accorderie.demande.service"]
            .default_get(["date_fin"])
            .get("date_fin")
        )
        default_description = (
            http.request.env["accorderie.demande.service"]
            .default_get(["description"])
            .get("description")
        )
        membre = http.request.env["accorderie.membre"].search(
            [("active", "=", True)]
        )
        default_membre = (
            http.request.env["accorderie.demande.service"]
            .default_get(["membre"])
            .get("membre")
        )
        default_titre = (
            http.request.env["accorderie.demande.service"]
            .default_get(["titre"])
            .get("titre")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_demande_service",
            {
                "accorderie": accorderie,
                "membre": membre,
                "page_name": "create_accorderie_demande_service",
                "default_accorderie": default_accorderie,
                "default_active": default_active,
                "default_approuver": default_approuver,
                "default_date_debut": default_date_debut,
                "default_date_fin": default_date_fin,
                "default_description": default_description,
                "default_membre": default_membre,
                "default_titre": default_titre,
            },
        )

    @http.route(
        "/submitted/accorderie_demande_service",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_demande_service(self, **kw):
        vals = {}

        if kw.get("accorderie") and kw.get("accorderie").isdigit():
            vals["accorderie"] = int(kw.get("accorderie"))

        default_active = (
            http.request.env["accorderie.demande.service"]
            .default_get(["active"])
            .get("active")
        )
        if kw.get("active"):
            vals["active"] = kw.get("active") == "True"
        elif default_active:
            vals["active"] = False

        default_approuver = (
            http.request.env["accorderie.demande.service"]
            .default_get(["approuver"])
            .get("approuver")
        )
        if kw.get("approuver"):
            vals["approuver"] = kw.get("approuver") == "True"
        elif default_approuver:
            vals["approuver"] = False

        if kw.get("date_debut"):
            vals["date_debut"] = kw.get("date_debut")

        if kw.get("date_fin"):
            vals["date_fin"] = kw.get("date_fin")

        if kw.get("description"):
            vals["description"] = kw.get("description")

        if kw.get("membre") and kw.get("membre").isdigit():
            vals["membre"] = int(kw.get("membre"))

        if kw.get("titre"):
            vals["titre"] = kw.get("titre")

        new_accorderie_demande_service = (
            request.env["accorderie.demande.service"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_demande_service/{new_accorderie_demande_service.id}"
        )

    @http.route(
        "/new/accorderie_droits_admin", type="http", auth="user", website=True
    )
    def create_new_accorderie_droits_admin(self, **kw):
        default_consulter_etat_compte = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["consulter_etat_compte"])
            .get("consulter_etat_compte")
        )
        default_consulter_profil = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["consulter_profil"])
            .get("consulter_profil")
        )
        default_gestion_dmd = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_dmd"])
            .get("gestion_dmd")
        )
        default_gestion_fichier = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_fichier"])
            .get("gestion_fichier")
        )
        default_gestion_offre = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_offre"])
            .get("gestion_offre")
        )
        default_gestion_offre_service = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_offre_service"])
            .get("gestion_offre_service")
        )
        default_gestion_profil = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_profil"])
            .get("gestion_profil")
        )
        default_gestion_type_service = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_type_service"])
            .get("gestion_type_service")
        )
        default_groupe_achat = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["groupe_achat"])
            .get("groupe_achat")
        )
        membre = http.request.env["accorderie.membre"].search(
            [("active", "=", True)]
        )
        default_membre = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["membre"])
            .get("membre")
        )
        default_nom_complet = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["nom_complet"])
            .get("nom_complet")
        )
        default_saisie_echange = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["saisie_echange"])
            .get("saisie_echange")
        )
        default_validation = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["validation"])
            .get("validation")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_droits_admin",
            {
                "membre": membre,
                "page_name": "create_accorderie_droits_admin",
                "default_consulter_etat_compte": default_consulter_etat_compte,
                "default_consulter_profil": default_consulter_profil,
                "default_gestion_dmd": default_gestion_dmd,
                "default_gestion_fichier": default_gestion_fichier,
                "default_gestion_offre": default_gestion_offre,
                "default_gestion_offre_service": default_gestion_offre_service,
                "default_gestion_profil": default_gestion_profil,
                "default_gestion_type_service": default_gestion_type_service,
                "default_groupe_achat": default_groupe_achat,
                "default_membre": default_membre,
                "default_nom_complet": default_nom_complet,
                "default_saisie_echange": default_saisie_echange,
                "default_validation": default_validation,
            },
        )

    @http.route(
        "/submitted/accorderie_droits_admin",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_droits_admin(self, **kw):
        vals = {}

        default_consulter_etat_compte = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["consulter_etat_compte"])
            .get("consulter_etat_compte")
        )
        if kw.get("consulter_etat_compte"):
            vals["consulter_etat_compte"] = (
                kw.get("consulter_etat_compte") == "True"
            )
        elif default_consulter_etat_compte:
            vals["consulter_etat_compte"] = False

        default_consulter_profil = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["consulter_profil"])
            .get("consulter_profil")
        )
        if kw.get("consulter_profil"):
            vals["consulter_profil"] = kw.get("consulter_profil") == "True"
        elif default_consulter_profil:
            vals["consulter_profil"] = False

        default_gestion_dmd = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_dmd"])
            .get("gestion_dmd")
        )
        if kw.get("gestion_dmd"):
            vals["gestion_dmd"] = kw.get("gestion_dmd") == "True"
        elif default_gestion_dmd:
            vals["gestion_dmd"] = False

        default_gestion_fichier = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_fichier"])
            .get("gestion_fichier")
        )
        if kw.get("gestion_fichier"):
            vals["gestion_fichier"] = kw.get("gestion_fichier") == "True"
        elif default_gestion_fichier:
            vals["gestion_fichier"] = False

        default_gestion_offre = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_offre"])
            .get("gestion_offre")
        )
        if kw.get("gestion_offre"):
            vals["gestion_offre"] = kw.get("gestion_offre") == "True"
        elif default_gestion_offre:
            vals["gestion_offre"] = False

        default_gestion_offre_service = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_offre_service"])
            .get("gestion_offre_service")
        )
        if kw.get("gestion_offre_service"):
            vals["gestion_offre_service"] = (
                kw.get("gestion_offre_service") == "True"
            )
        elif default_gestion_offre_service:
            vals["gestion_offre_service"] = False

        default_gestion_profil = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_profil"])
            .get("gestion_profil")
        )
        if kw.get("gestion_profil"):
            vals["gestion_profil"] = kw.get("gestion_profil") == "True"
        elif default_gestion_profil:
            vals["gestion_profil"] = False

        default_gestion_type_service = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["gestion_type_service"])
            .get("gestion_type_service")
        )
        if kw.get("gestion_type_service"):
            vals["gestion_type_service"] = (
                kw.get("gestion_type_service") == "True"
            )
        elif default_gestion_type_service:
            vals["gestion_type_service"] = False

        default_groupe_achat = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["groupe_achat"])
            .get("groupe_achat")
        )
        if kw.get("groupe_achat"):
            vals["groupe_achat"] = kw.get("groupe_achat") == "True"
        elif default_groupe_achat:
            vals["groupe_achat"] = False

        if kw.get("membre") and kw.get("membre").isdigit():
            vals["membre"] = int(kw.get("membre"))

        if kw.get("nom_complet"):
            vals["nom_complet"] = kw.get("nom_complet")

        default_saisie_echange = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["saisie_echange"])
            .get("saisie_echange")
        )
        if kw.get("saisie_echange"):
            vals["saisie_echange"] = kw.get("saisie_echange") == "True"
        elif default_saisie_echange:
            vals["saisie_echange"] = False

        default_validation = (
            http.request.env["accorderie.droits.admin"]
            .default_get(["validation"])
            .get("validation")
        )
        if kw.get("validation"):
            vals["validation"] = kw.get("validation") == "True"
        elif default_validation:
            vals["validation"] = False

        new_accorderie_droits_admin = (
            request.env["accorderie.droits.admin"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_droits_admin/{new_accorderie_droits_admin.id}"
        )

    @http.route(
        "/new/accorderie_echange_service",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_echange_service(self, **kw):
        default_commentaire = (
            http.request.env["accorderie.echange.service"]
            .default_get(["commentaire"])
            .get("commentaire")
        )
        default_date_echange = (
            http.request.env["accorderie.echange.service"]
            .default_get(["date_echange"])
            .get("date_echange")
        )
        demande_service = http.request.env[
            "accorderie.demande.service"
        ].search([("active", "=", True)])
        default_demande_service = (
            http.request.env["accorderie.echange.service"]
            .default_get(["demande_service"])
            .get("demande_service")
        )
        membre_acheteur = http.request.env["accorderie.membre"].search(
            [("active", "=", True)]
        )
        default_membre_acheteur = (
            http.request.env["accorderie.echange.service"]
            .default_get(["membre_acheteur"])
            .get("membre_acheteur")
        )
        membre_vendeur = http.request.env["accorderie.membre"].search(
            [("active", "=", True)]
        )
        default_membre_vendeur = (
            http.request.env["accorderie.echange.service"]
            .default_get(["membre_vendeur"])
            .get("membre_vendeur")
        )
        default_nb_heure = (
            http.request.env["accorderie.echange.service"]
            .default_get(["nb_heure"])
            .get("nb_heure")
        )
        default_nom_complet = (
            http.request.env["accorderie.echange.service"]
            .default_get(["nom_complet"])
            .get("nom_complet")
        )
        offre_service = http.request.env["accorderie.offre.service"].search(
            [("active", "=", True)]
        )
        default_offre_service = (
            http.request.env["accorderie.echange.service"]
            .default_get(["offre_service"])
            .get("offre_service")
        )
        point_service = http.request.env["accorderie.point.service"].search([])
        default_point_service = (
            http.request.env["accorderie.echange.service"]
            .default_get(["point_service"])
            .get("point_service")
        )
        default_remarque = (
            http.request.env["accorderie.echange.service"]
            .default_get(["remarque"])
            .get("remarque")
        )
        type_echange = (
            http.request.env["accorderie.echange.service"]
            ._fields["type_echange"]
            .selection
        )
        default_type_echange = (
            http.request.env["accorderie.echange.service"]
            .default_get(["type_echange"])
            .get("type_echange")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_echange_service",
            {
                "demande_service": demande_service,
                "membre_acheteur": membre_acheteur,
                "membre_vendeur": membre_vendeur,
                "offre_service": offre_service,
                "point_service": point_service,
                "type_echange": type_echange,
                "page_name": "create_accorderie_echange_service",
                "default_commentaire": default_commentaire,
                "default_date_echange": default_date_echange,
                "default_demande_service": default_demande_service,
                "default_membre_acheteur": default_membre_acheteur,
                "default_membre_vendeur": default_membre_vendeur,
                "default_nb_heure": default_nb_heure,
                "default_nom_complet": default_nom_complet,
                "default_offre_service": default_offre_service,
                "default_point_service": default_point_service,
                "default_remarque": default_remarque,
                "default_type_echange": default_type_echange,
            },
        )

    @http.route(
        "/submitted/accorderie_echange_service",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_echange_service(self, **kw):
        vals = {}

        if kw.get("commentaire"):
            vals["commentaire"] = kw.get("commentaire")

        if kw.get("date_echange"):
            vals["date_echange"] = kw.get("date_echange")

        if kw.get("demande_service") and kw.get("demande_service").isdigit():
            vals["demande_service"] = int(kw.get("demande_service"))

        if kw.get("membre_acheteur") and kw.get("membre_acheteur").isdigit():
            vals["membre_acheteur"] = int(kw.get("membre_acheteur"))

        if kw.get("membre_vendeur") and kw.get("membre_vendeur").isdigit():
            vals["membre_vendeur"] = int(kw.get("membre_vendeur"))

        if kw.get("nb_heure"):
            nb_heure_value = kw.get("nb_heure")
            tpl_time_nb_heure = nb_heure_value.split(":")
            if len(tpl_time_nb_heure) == 1:
                if tpl_time_nb_heure[0].isdigit():
                    vals["nb_heure"] = int(tpl_time_nb_heure[0])
            elif len(tpl_time_nb_heure) == 2:
                if (
                    tpl_time_nb_heure[0].isdigit()
                    and tpl_time_nb_heure[1].isdigit()
                ):
                    vals["nb_heure"] = (
                        int(tpl_time_nb_heure[0])
                        + int(tpl_time_nb_heure[1]) / 60.0
                    )

        if kw.get("nom_complet"):
            vals["nom_complet"] = kw.get("nom_complet")

        if kw.get("offre_service") and kw.get("offre_service").isdigit():
            vals["offre_service"] = int(kw.get("offre_service"))

        if kw.get("point_service") and kw.get("point_service").isdigit():
            vals["point_service"] = int(kw.get("point_service"))

        if kw.get("remarque"):
            vals["remarque"] = kw.get("remarque")

        new_accorderie_echange_service = (
            request.env["accorderie.echange.service"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_echange_service/{new_accorderie_echange_service.id}"
        )

    @http.route(
        "/new/accorderie_fichier", type="http", auth="user", website=True
    )
    def create_new_accorderie_fichier(self, **kw):
        accorderie = http.request.env["accorderie.accorderie"].search(
            [("active", "=", True)]
        )
        default_accorderie = (
            http.request.env["accorderie.fichier"]
            .default_get(["accorderie"])
            .get("accorderie")
        )
        default_date_mise_a_jour = (
            http.request.env["accorderie.fichier"]
            .default_get(["date_mise_a_jour"])
            .get("date_mise_a_jour")
        )
        default_nom = (
            http.request.env["accorderie.fichier"]
            .default_get(["nom"])
            .get("nom")
        )
        default_si_accorderie_local_seulement = (
            http.request.env["accorderie.fichier"]
            .default_get(["si_accorderie_local_seulement"])
            .get("si_accorderie_local_seulement")
        )
        default_si_admin = (
            http.request.env["accorderie.fichier"]
            .default_get(["si_admin"])
            .get("si_admin")
        )
        default_si_disponible = (
            http.request.env["accorderie.fichier"]
            .default_get(["si_disponible"])
            .get("si_disponible")
        )
        type_fichier = http.request.env["accorderie.type.fichier"].search([])
        default_type_fichier = (
            http.request.env["accorderie.fichier"]
            .default_get(["type_fichier"])
            .get("type_fichier")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_fichier",
            {
                "accorderie": accorderie,
                "type_fichier": type_fichier,
                "page_name": "create_accorderie_fichier",
                "default_accorderie": default_accorderie,
                "default_date_mise_a_jour": default_date_mise_a_jour,
                "default_nom": default_nom,
                "default_si_accorderie_local_seulement": default_si_accorderie_local_seulement,
                "default_si_admin": default_si_admin,
                "default_si_disponible": default_si_disponible,
                "default_type_fichier": default_type_fichier,
            },
        )

    @http.route(
        "/submitted/accorderie_fichier",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_fichier(self, **kw):
        vals = {}

        if kw.get("accorderie") and kw.get("accorderie").isdigit():
            vals["accorderie"] = int(kw.get("accorderie"))

        if kw.get("date_mise_a_jour"):
            vals["date_mise_a_jour"] = kw.get("date_mise_a_jour")

        if kw.get("fichier"):
            lst_file_fichier = request.httprequest.files.getlist("fichier")
            if lst_file_fichier:
                vals["fichier"] = base64.b64encode(lst_file_fichier[-1].read())

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        default_si_accorderie_local_seulement = (
            http.request.env["accorderie.fichier"]
            .default_get(["si_accorderie_local_seulement"])
            .get("si_accorderie_local_seulement")
        )
        if kw.get("si_accorderie_local_seulement"):
            vals["si_accorderie_local_seulement"] = (
                kw.get("si_accorderie_local_seulement") == "True"
            )
        elif default_si_accorderie_local_seulement:
            vals["si_accorderie_local_seulement"] = False

        default_si_admin = (
            http.request.env["accorderie.fichier"]
            .default_get(["si_admin"])
            .get("si_admin")
        )
        if kw.get("si_admin"):
            vals["si_admin"] = kw.get("si_admin") == "True"
        elif default_si_admin:
            vals["si_admin"] = False

        default_si_disponible = (
            http.request.env["accorderie.fichier"]
            .default_get(["si_disponible"])
            .get("si_disponible")
        )
        if kw.get("si_disponible"):
            vals["si_disponible"] = kw.get("si_disponible") == "True"
        elif default_si_disponible:
            vals["si_disponible"] = False

        if kw.get("type_fichier") and kw.get("type_fichier").isdigit():
            vals["type_fichier"] = int(kw.get("type_fichier"))

        new_accorderie_fichier = (
            request.env["accorderie.fichier"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_fichier/{new_accorderie_fichier.id}"
        )

    @http.route(
        "/new/accorderie_membre", type="http", auth="user", website=True
    )
    def create_new_accorderie_membre(self, **kw):
        accorderie = http.request.env["accorderie.accorderie"].search(
            [("active", "=", True)]
        )
        default_accorderie = (
            http.request.env["accorderie.membre"]
            .default_get(["accorderie"])
            .get("accorderie")
        )
        default_achat_regrouper = (
            http.request.env["accorderie.membre"]
            .default_get(["achat_regrouper"])
            .get("achat_regrouper")
        )
        default_active = (
            http.request.env["accorderie.membre"]
            .default_get(["active"])
            .get("active")
        )
        default_adresse = (
            http.request.env["accorderie.membre"]
            .default_get(["adresse"])
            .get("adresse")
        )
        default_annee_naissance = (
            http.request.env["accorderie.membre"]
            .default_get(["annee_naissance"])
            .get("annee_naissance")
        )
        arrondissement = http.request.env["accorderie.arrondissement"].search(
            []
        )
        default_arrondissement = (
            http.request.env["accorderie.membre"]
            .default_get(["arrondissement"])
            .get("arrondissement")
        )
        default_bottin_courriel = (
            http.request.env["accorderie.membre"]
            .default_get(["bottin_courriel"])
            .get("bottin_courriel")
        )
        default_bottin_tel = (
            http.request.env["accorderie.membre"]
            .default_get(["bottin_tel"])
            .get("bottin_tel")
        )
        default_codepostal = (
            http.request.env["accorderie.membre"]
            .default_get(["codepostal"])
            .get("codepostal")
        )
        default_courriel = (
            http.request.env["accorderie.membre"]
            .default_get(["courriel"])
            .get("courriel")
        )
        default_date_adhesion = (
            http.request.env["accorderie.membre"]
            .default_get(["date_adhesion"])
            .get("date_adhesion")
        )
        default_date_mise_a_jour = (
            http.request.env["accorderie.membre"]
            .default_get(["date_mise_a_jour"])
            .get("date_mise_a_jour")
        )
        default_description_membre = (
            http.request.env["accorderie.membre"]
            .default_get(["description_membre"])
            .get("description_membre")
        )
        default_est_un_point_service = (
            http.request.env["accorderie.membre"]
            .default_get(["est_un_point_service"])
            .get("est_un_point_service")
        )
        default_membre_ca = (
            http.request.env["accorderie.membre"]
            .default_get(["membre_ca"])
            .get("membre_ca")
        )
        default_membre_conjoint = (
            http.request.env["accorderie.membre"]
            .default_get(["membre_conjoint"])
            .get("membre_conjoint")
        )
        default_membre_conjoint_id = (
            http.request.env["accorderie.membre"]
            .default_get(["membre_conjoint_id"])
            .get("membre_conjoint_id")
        )
        default_membre_principal = (
            http.request.env["accorderie.membre"]
            .default_get(["membre_principal"])
            .get("membre_principal")
        )
        default_memo = (
            http.request.env["accorderie.membre"]
            .default_get(["memo"])
            .get("memo")
        )
        default_nom = (
            http.request.env["accorderie.membre"]
            .default_get(["nom"])
            .get("nom")
        )
        default_nom_complet = (
            http.request.env["accorderie.membre"]
            .default_get(["nom_complet"])
            .get("nom_complet")
        )
        default_nom_utilisateur = (
            http.request.env["accorderie.membre"]
            .default_get(["nom_utilisateur"])
            .get("nom_utilisateur")
        )
        occupation = http.request.env["accorderie.occupation"].search([])
        default_occupation = (
            http.request.env["accorderie.membre"]
            .default_get(["occupation"])
            .get("occupation")
        )
        origine = http.request.env["accorderie.origine"].search([])
        default_origine = (
            http.request.env["accorderie.membre"]
            .default_get(["origine"])
            .get("origine")
        )
        default_part_social_paye = (
            http.request.env["accorderie.membre"]
            .default_get(["part_social_paye"])
            .get("part_social_paye")
        )
        default_pas_communication = (
            http.request.env["accorderie.membre"]
            .default_get(["pas_communication"])
            .get("pas_communication")
        )
        point_service = http.request.env["accorderie.point.service"].search([])
        default_point_service = (
            http.request.env["accorderie.membre"]
            .default_get(["point_service"])
            .get("point_service")
        )
        default_prenom = (
            http.request.env["accorderie.membre"]
            .default_get(["prenom"])
            .get("prenom")
        )
        default_pret_actif = (
            http.request.env["accorderie.membre"]
            .default_get(["pret_actif"])
            .get("pret_actif")
        )
        default_profil_approuver = (
            http.request.env["accorderie.membre"]
            .default_get(["profil_approuver"])
            .get("profil_approuver")
        )
        provenance = http.request.env["accorderie.provenance"].search([])
        default_provenance = (
            http.request.env["accorderie.membre"]
            .default_get(["provenance"])
            .get("provenance")
        )
        quartier = http.request.env["accorderie.quartier"].search([])
        default_quartier = (
            http.request.env["accorderie.membre"]
            .default_get(["quartier"])
            .get("quartier")
        )
        default_recevoir_courriel_groupe = (
            http.request.env["accorderie.membre"]
            .default_get(["recevoir_courriel_groupe"])
            .get("recevoir_courriel_groupe")
        )
        region = http.request.env["accorderie.region"].search([])
        default_region = (
            http.request.env["accorderie.membre"]
            .default_get(["region"])
            .get("region")
        )
        revenu_familial = http.request.env[
            "accorderie.revenu.familial"
        ].search([])
        default_revenu_familial = (
            http.request.env["accorderie.membre"]
            .default_get(["revenu_familial"])
            .get("revenu_familial")
        )
        sexe = http.request.env["accorderie.membre"]._fields["sexe"].selection
        default_sexe = (
            http.request.env["accorderie.membre"]
            .default_get(["sexe"])
            .get("sexe")
        )
        situation_maison = http.request.env[
            "accorderie.situation.maison"
        ].search([])
        default_situation_maison = (
            http.request.env["accorderie.membre"]
            .default_get(["situation_maison"])
            .get("situation_maison")
        )
        default_telephone_1 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_1"])
            .get("telephone_1")
        )
        default_telephone_2 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_2"])
            .get("telephone_2")
        )
        default_telephone_3 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_3"])
            .get("telephone_3")
        )
        default_telephone_poste_1 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_poste_1"])
            .get("telephone_poste_1")
        )
        default_telephone_poste_2 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_poste_2"])
            .get("telephone_poste_2")
        )
        default_telephone_poste_3 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_poste_3"])
            .get("telephone_poste_3")
        )
        telephone_type_1 = http.request.env[
            "accorderie.type.telephone"
        ].search([])
        default_telephone_type_1 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_type_1"])
            .get("telephone_type_1")
        )
        telephone_type_2 = http.request.env[
            "accorderie.type.telephone"
        ].search([])
        default_telephone_type_2 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_type_2"])
            .get("telephone_type_2")
        )
        telephone_type_3 = http.request.env[
            "accorderie.type.telephone"
        ].search([])
        default_telephone_type_3 = (
            http.request.env["accorderie.membre"]
            .default_get(["telephone_type_3"])
            .get("telephone_type_3")
        )
        transfert_accorderie = http.request.env[
            "accorderie.accorderie"
        ].search([("active", "=", True)])
        default_transfert_accorderie = (
            http.request.env["accorderie.membre"]
            .default_get(["transfert_accorderie"])
            .get("transfert_accorderie")
        )
        type_communication = http.request.env[
            "accorderie.type.communication"
        ].search([])
        default_type_communication = (
            http.request.env["accorderie.membre"]
            .default_get(["type_communication"])
            .get("type_communication")
        )
        ville = http.request.env["accorderie.ville"].search([])
        default_ville = (
            http.request.env["accorderie.membre"]
            .default_get(["ville"])
            .get("ville")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_membre",
            {
                "accorderie": accorderie,
                "arrondissement": arrondissement,
                "occupation": occupation,
                "origine": origine,
                "point_service": point_service,
                "provenance": provenance,
                "quartier": quartier,
                "region": region,
                "revenu_familial": revenu_familial,
                "sexe": sexe,
                "situation_maison": situation_maison,
                "telephone_type_1": telephone_type_1,
                "telephone_type_2": telephone_type_2,
                "telephone_type_3": telephone_type_3,
                "transfert_accorderie": transfert_accorderie,
                "type_communication": type_communication,
                "ville": ville,
                "page_name": "create_accorderie_membre",
                "default_accorderie": default_accorderie,
                "default_achat_regrouper": default_achat_regrouper,
                "default_active": default_active,
                "default_adresse": default_adresse,
                "default_annee_naissance": default_annee_naissance,
                "default_arrondissement": default_arrondissement,
                "default_bottin_courriel": default_bottin_courriel,
                "default_bottin_tel": default_bottin_tel,
                "default_codepostal": default_codepostal,
                "default_courriel": default_courriel,
                "default_date_adhesion": default_date_adhesion,
                "default_date_mise_a_jour": default_date_mise_a_jour,
                "default_description_membre": default_description_membre,
                "default_est_un_point_service": default_est_un_point_service,
                "default_membre_ca": default_membre_ca,
                "default_membre_conjoint": default_membre_conjoint,
                "default_membre_conjoint_id": default_membre_conjoint_id,
                "default_membre_principal": default_membre_principal,
                "default_memo": default_memo,
                "default_nom": default_nom,
                "default_nom_complet": default_nom_complet,
                "default_nom_utilisateur": default_nom_utilisateur,
                "default_occupation": default_occupation,
                "default_origine": default_origine,
                "default_part_social_paye": default_part_social_paye,
                "default_pas_communication": default_pas_communication,
                "default_point_service": default_point_service,
                "default_prenom": default_prenom,
                "default_pret_actif": default_pret_actif,
                "default_profil_approuver": default_profil_approuver,
                "default_provenance": default_provenance,
                "default_quartier": default_quartier,
                "default_recevoir_courriel_groupe": default_recevoir_courriel_groupe,
                "default_region": default_region,
                "default_revenu_familial": default_revenu_familial,
                "default_sexe": default_sexe,
                "default_situation_maison": default_situation_maison,
                "default_telephone_1": default_telephone_1,
                "default_telephone_2": default_telephone_2,
                "default_telephone_3": default_telephone_3,
                "default_telephone_poste_1": default_telephone_poste_1,
                "default_telephone_poste_2": default_telephone_poste_2,
                "default_telephone_poste_3": default_telephone_poste_3,
                "default_telephone_type_1": default_telephone_type_1,
                "default_telephone_type_2": default_telephone_type_2,
                "default_telephone_type_3": default_telephone_type_3,
                "default_transfert_accorderie": default_transfert_accorderie,
                "default_type_communication": default_type_communication,
                "default_ville": default_ville,
            },
        )

    @http.route(
        "/submitted/accorderie_membre",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_membre(self, **kw):
        vals = {}

        if kw.get("accorderie") and kw.get("accorderie").isdigit():
            vals["accorderie"] = int(kw.get("accorderie"))

        default_achat_regrouper = (
            http.request.env["accorderie.membre"]
            .default_get(["achat_regrouper"])
            .get("achat_regrouper")
        )
        if kw.get("achat_regrouper"):
            vals["achat_regrouper"] = kw.get("achat_regrouper") == "True"
        elif default_achat_regrouper:
            vals["achat_regrouper"] = False

        default_active = (
            http.request.env["accorderie.membre"]
            .default_get(["active"])
            .get("active")
        )
        if kw.get("active"):
            vals["active"] = kw.get("active") == "True"
        elif default_active:
            vals["active"] = False

        if kw.get("adresse"):
            vals["adresse"] = kw.get("adresse")

        if kw.get("annee_naissance"):
            annee_naissance_value = kw.get("annee_naissance")
            if annee_naissance_value.isdigit():
                vals["annee_naissance"] = int(annee_naissance_value)

        if kw.get("arrondissement") and kw.get("arrondissement").isdigit():
            vals["arrondissement"] = int(kw.get("arrondissement"))

        default_bottin_courriel = (
            http.request.env["accorderie.membre"]
            .default_get(["bottin_courriel"])
            .get("bottin_courriel")
        )
        if kw.get("bottin_courriel"):
            vals["bottin_courriel"] = kw.get("bottin_courriel") == "True"
        elif default_bottin_courriel:
            vals["bottin_courriel"] = False

        default_bottin_tel = (
            http.request.env["accorderie.membre"]
            .default_get(["bottin_tel"])
            .get("bottin_tel")
        )
        if kw.get("bottin_tel"):
            vals["bottin_tel"] = kw.get("bottin_tel") == "True"
        elif default_bottin_tel:
            vals["bottin_tel"] = False

        if kw.get("codepostal"):
            vals["codepostal"] = kw.get("codepostal")

        if kw.get("courriel"):
            vals["courriel"] = kw.get("courriel")

        if kw.get("date_adhesion"):
            vals["date_adhesion"] = kw.get("date_adhesion")

        if kw.get("date_mise_a_jour"):
            vals["date_mise_a_jour"] = kw.get("date_mise_a_jour")

        default_description_membre = (
            http.request.env["accorderie.membre"]
            .default_get(["description_membre"])
            .get("description_membre")
        )
        if kw.get("description_membre"):
            vals["description_membre"] = kw.get("description_membre") == "True"
        elif default_description_membre:
            vals["description_membre"] = False

        default_est_un_point_service = (
            http.request.env["accorderie.membre"]
            .default_get(["est_un_point_service"])
            .get("est_un_point_service")
        )
        if kw.get("est_un_point_service"):
            vals["est_un_point_service"] = (
                kw.get("est_un_point_service") == "True"
            )
        elif default_est_un_point_service:
            vals["est_un_point_service"] = False

        default_membre_ca = (
            http.request.env["accorderie.membre"]
            .default_get(["membre_ca"])
            .get("membre_ca")
        )
        if kw.get("membre_ca"):
            vals["membre_ca"] = kw.get("membre_ca") == "True"
        elif default_membre_ca:
            vals["membre_ca"] = False

        default_membre_conjoint = (
            http.request.env["accorderie.membre"]
            .default_get(["membre_conjoint"])
            .get("membre_conjoint")
        )
        if kw.get("membre_conjoint"):
            vals["membre_conjoint"] = kw.get("membre_conjoint") == "True"
        elif default_membre_conjoint:
            vals["membre_conjoint"] = False

        if kw.get("membre_conjoint_id"):
            membre_conjoint_id_value = kw.get("membre_conjoint_id")
            if membre_conjoint_id_value.isdigit():
                vals["membre_conjoint_id"] = int(membre_conjoint_id_value)

        default_membre_principal = (
            http.request.env["accorderie.membre"]
            .default_get(["membre_principal"])
            .get("membre_principal")
        )
        if kw.get("membre_principal"):
            vals["membre_principal"] = kw.get("membre_principal") == "True"
        elif default_membre_principal:
            vals["membre_principal"] = False

        if kw.get("memo"):
            vals["memo"] = kw.get("memo")

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        if kw.get("nom_complet"):
            vals["nom_complet"] = kw.get("nom_complet")

        if kw.get("nom_utilisateur"):
            vals["nom_utilisateur"] = kw.get("nom_utilisateur")

        if kw.get("occupation") and kw.get("occupation").isdigit():
            vals["occupation"] = int(kw.get("occupation"))

        if kw.get("origine") and kw.get("origine").isdigit():
            vals["origine"] = int(kw.get("origine"))

        default_part_social_paye = (
            http.request.env["accorderie.membre"]
            .default_get(["part_social_paye"])
            .get("part_social_paye")
        )
        if kw.get("part_social_paye"):
            vals["part_social_paye"] = kw.get("part_social_paye") == "True"
        elif default_part_social_paye:
            vals["part_social_paye"] = False

        default_pas_communication = (
            http.request.env["accorderie.membre"]
            .default_get(["pas_communication"])
            .get("pas_communication")
        )
        if kw.get("pas_communication"):
            vals["pas_communication"] = kw.get("pas_communication") == "True"
        elif default_pas_communication:
            vals["pas_communication"] = False

        if kw.get("point_service") and kw.get("point_service").isdigit():
            vals["point_service"] = int(kw.get("point_service"))

        if kw.get("prenom"):
            vals["prenom"] = kw.get("prenom")

        default_pret_actif = (
            http.request.env["accorderie.membre"]
            .default_get(["pret_actif"])
            .get("pret_actif")
        )
        if kw.get("pret_actif"):
            vals["pret_actif"] = kw.get("pret_actif") == "True"
        elif default_pret_actif:
            vals["pret_actif"] = False

        default_profil_approuver = (
            http.request.env["accorderie.membre"]
            .default_get(["profil_approuver"])
            .get("profil_approuver")
        )
        if kw.get("profil_approuver"):
            vals["profil_approuver"] = kw.get("profil_approuver") == "True"
        elif default_profil_approuver:
            vals["profil_approuver"] = False

        if kw.get("provenance") and kw.get("provenance").isdigit():
            vals["provenance"] = int(kw.get("provenance"))

        if kw.get("quartier") and kw.get("quartier").isdigit():
            vals["quartier"] = int(kw.get("quartier"))

        default_recevoir_courriel_groupe = (
            http.request.env["accorderie.membre"]
            .default_get(["recevoir_courriel_groupe"])
            .get("recevoir_courriel_groupe")
        )
        if kw.get("recevoir_courriel_groupe"):
            vals["recevoir_courriel_groupe"] = (
                kw.get("recevoir_courriel_groupe") == "True"
            )
        elif default_recevoir_courriel_groupe:
            vals["recevoir_courriel_groupe"] = False

        if kw.get("region") and kw.get("region").isdigit():
            vals["region"] = int(kw.get("region"))

        if kw.get("revenu_familial") and kw.get("revenu_familial").isdigit():
            vals["revenu_familial"] = int(kw.get("revenu_familial"))

        if kw.get("situation_maison") and kw.get("situation_maison").isdigit():
            vals["situation_maison"] = int(kw.get("situation_maison"))

        if kw.get("telephone_1"):
            vals["telephone_1"] = kw.get("telephone_1")

        if kw.get("telephone_2"):
            vals["telephone_2"] = kw.get("telephone_2")

        if kw.get("telephone_3"):
            vals["telephone_3"] = kw.get("telephone_3")

        if kw.get("telephone_poste_1"):
            vals["telephone_poste_1"] = kw.get("telephone_poste_1")

        if kw.get("telephone_poste_2"):
            vals["telephone_poste_2"] = kw.get("telephone_poste_2")

        if kw.get("telephone_poste_3"):
            vals["telephone_poste_3"] = kw.get("telephone_poste_3")

        if kw.get("telephone_type_1") and kw.get("telephone_type_1").isdigit():
            vals["telephone_type_1"] = int(kw.get("telephone_type_1"))

        if kw.get("telephone_type_2") and kw.get("telephone_type_2").isdigit():
            vals["telephone_type_2"] = int(kw.get("telephone_type_2"))

        if kw.get("telephone_type_3") and kw.get("telephone_type_3").isdigit():
            vals["telephone_type_3"] = int(kw.get("telephone_type_3"))

        if (
            kw.get("transfert_accorderie")
            and kw.get("transfert_accorderie").isdigit()
        ):
            vals["transfert_accorderie"] = int(kw.get("transfert_accorderie"))

        if (
            kw.get("type_communication")
            and kw.get("type_communication").isdigit()
        ):
            vals["type_communication"] = int(kw.get("type_communication"))

        if kw.get("ville") and kw.get("ville").isdigit():
            vals["ville"] = int(kw.get("ville"))

        new_accorderie_membre = (
            request.env["accorderie.membre"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_membre/{new_accorderie_membre.id}"
        )

    @http.route(
        "/new/accorderie_occupation", type="http", auth="user", website=True
    )
    def create_new_accorderie_occupation(self, **kw):
        default_nom = (
            http.request.env["accorderie.occupation"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_occupation",
            {
                "page_name": "create_accorderie_occupation",
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_occupation",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_occupation(self, **kw):
        vals = {}

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_occupation = (
            request.env["accorderie.occupation"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_occupation/{new_accorderie_occupation.id}"
        )

    @http.route(
        "/new/accorderie_offre_service", type="http", auth="user", website=True
    )
    def create_new_accorderie_offre_service(self, **kw):
        default_accompli = (
            http.request.env["accorderie.offre.service"]
            .default_get(["accompli"])
            .get("accompli")
        )
        accorderie = http.request.env["accorderie.accorderie"].search(
            [("active", "=", True)]
        )
        default_accorderie = (
            http.request.env["accorderie.offre.service"]
            .default_get(["accorderie"])
            .get("accorderie")
        )
        default_active = (
            http.request.env["accorderie.offre.service"]
            .default_get(["active"])
            .get("active")
        )
        default_approuve = (
            http.request.env["accorderie.offre.service"]
            .default_get(["approuve"])
            .get("approuve")
        )
        default_condition = (
            http.request.env["accorderie.offre.service"]
            .default_get(["condition"])
            .get("condition")
        )
        default_condition_autre = (
            http.request.env["accorderie.offre.service"]
            .default_get(["condition_autre"])
            .get("condition_autre")
        )
        default_date_affichage = (
            http.request.env["accorderie.offre.service"]
            .default_get(["date_affichage"])
            .get("date_affichage")
        )
        default_date_debut = (
            http.request.env["accorderie.offre.service"]
            .default_get(["date_debut"])
            .get("date_debut")
        )
        default_date_fin = (
            http.request.env["accorderie.offre.service"]
            .default_get(["date_fin"])
            .get("date_fin")
        )
        default_date_mise_a_jour = (
            http.request.env["accorderie.offre.service"]
            .default_get(["date_mise_a_jour"])
            .get("date_mise_a_jour")
        )
        default_description = (
            http.request.env["accorderie.offre.service"]
            .default_get(["description"])
            .get("description")
        )
        default_disponibilite = (
            http.request.env["accorderie.offre.service"]
            .default_get(["disponibilite"])
            .get("disponibilite")
        )
        membre = http.request.env["accorderie.membre"].search(
            [("active", "=", True)]
        )
        default_membre = (
            http.request.env["accorderie.offre.service"]
            .default_get(["membre"])
            .get("membre")
        )
        default_nb_consultation = (
            http.request.env["accorderie.offre.service"]
            .default_get(["nb_consultation"])
            .get("nb_consultation")
        )
        default_nom_offre_special = (
            http.request.env["accorderie.offre.service"]
            .default_get(["nom_offre_special"])
            .get("nom_offre_special")
        )
        default_offre_special = (
            http.request.env["accorderie.offre.service"]
            .default_get(["offre_special"])
            .get("offre_special")
        )
        default_tarif = (
            http.request.env["accorderie.offre.service"]
            .default_get(["tarif"])
            .get("tarif")
        )
        type_service_id = http.request.env["accorderie.type.service"].search(
            [("active", "=", True)]
        )
        default_type_service_id = (
            http.request.env["accorderie.offre.service"]
            .default_get(["type_service_id"])
            .get("type_service_id")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_offre_service",
            {
                "accorderie": accorderie,
                "membre": membre,
                "type_service_id": type_service_id,
                "page_name": "create_accorderie_offre_service",
                "default_accompli": default_accompli,
                "default_accorderie": default_accorderie,
                "default_active": default_active,
                "default_approuve": default_approuve,
                "default_condition": default_condition,
                "default_condition_autre": default_condition_autre,
                "default_date_affichage": default_date_affichage,
                "default_date_debut": default_date_debut,
                "default_date_fin": default_date_fin,
                "default_date_mise_a_jour": default_date_mise_a_jour,
                "default_description": default_description,
                "default_disponibilite": default_disponibilite,
                "default_membre": default_membre,
                "default_nb_consultation": default_nb_consultation,
                "default_nom_offre_special": default_nom_offre_special,
                "default_offre_special": default_offre_special,
                "default_tarif": default_tarif,
                "default_type_service_id": default_type_service_id,
            },
        )

    @http.route(
        "/submitted/accorderie_offre_service",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_offre_service(self, **kw):
        vals = {}

        default_accompli = (
            http.request.env["accorderie.offre.service"]
            .default_get(["accompli"])
            .get("accompli")
        )
        if kw.get("accompli"):
            vals["accompli"] = kw.get("accompli") == "True"
        elif default_accompli:
            vals["accompli"] = False

        if kw.get("accorderie") and kw.get("accorderie").isdigit():
            vals["accorderie"] = int(kw.get("accorderie"))

        default_active = (
            http.request.env["accorderie.offre.service"]
            .default_get(["active"])
            .get("active")
        )
        if kw.get("active"):
            vals["active"] = kw.get("active") == "True"
        elif default_active:
            vals["active"] = default_active

        default_approuve = (
            http.request.env["accorderie.offre.service"]
            .default_get(["approuve"])
            .get("approuve")
        )
        if kw.get("approuve"):
            vals["approuve"] = kw.get("approuve") == "True"
        elif default_approuve:
            vals["approuve"] = False

        if kw.get("condition"):
            vals["condition"] = kw.get("condition")

        if kw.get("condition_autre"):
            vals["condition_autre"] = kw.get("condition_autre")

        if kw.get("date_affichage"):
            vals["date_affichage"] = kw.get("date_affichage")

        if kw.get("date_debut"):
            vals["date_debut"] = kw.get("date_debut")

        if kw.get("date_fin"):
            vals["date_fin"] = kw.get("date_fin")

        if kw.get("date_mise_a_jour"):
            vals["date_mise_a_jour"] = kw.get("date_mise_a_jour")

        if kw.get("description"):
            vals["description"] = kw.get("description")

        if kw.get("disponibilite"):
            vals["disponibilite"] = kw.get("disponibilite")

        if kw.get("membre") and kw.get("membre").isdigit():
            vals["membre"] = int(kw.get("membre"))

        if kw.get("nb_consultation"):
            nb_consultation_value = kw.get("nb_consultation")
            if nb_consultation_value.isdigit():
                vals["nb_consultation"] = int(nb_consultation_value)

        if kw.get("nom_offre_special"):
            vals["nom_offre_special"] = kw.get("nom_offre_special")

        default_offre_special = (
            http.request.env["accorderie.offre.service"]
            .default_get(["offre_special"])
            .get("offre_special")
        )
        if kw.get("offre_special"):
            vals["offre_special"] = kw.get("offre_special") == "True"
        elif default_offre_special:
            vals["offre_special"] = False

        if kw.get("tarif"):
            vals["tarif"] = kw.get("tarif")

        if kw.get("type_service_id") and kw.get("type_service_id").isdigit():
            vals["type_service_id"] = int(kw.get("type_service_id"))

        new_accorderie_offre_service = (
            request.env["accorderie.offre.service"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_offre_service/{new_accorderie_offre_service.id}"
        )

    @http.route(
        "/new/accorderie_origine", type="http", auth="user", website=True
    )
    def create_new_accorderie_origine(self, **kw):
        default_nom = (
            http.request.env["accorderie.origine"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_origine",
            {
                "page_name": "create_accorderie_origine",
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_origine",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_origine(self, **kw):
        vals = {}

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_origine = (
            request.env["accorderie.origine"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_origine/{new_accorderie_origine.id}"
        )

    @http.route(
        "/new/accorderie_point_service", type="http", auth="user", website=True
    )
    def create_new_accorderie_point_service(self, **kw):
        accorderie = http.request.env["accorderie.accorderie"].search(
            [("active", "=", True)]
        )
        default_accorderie = (
            http.request.env["accorderie.point.service"]
            .default_get(["accorderie"])
            .get("accorderie")
        )
        default_date_mise_a_jour = (
            http.request.env["accorderie.point.service"]
            .default_get(["date_mise_a_jour"])
            .get("date_mise_a_jour")
        )
        default_nom = (
            http.request.env["accorderie.point.service"]
            .default_get(["nom"])
            .get("nom")
        )
        default_sequence = (
            http.request.env["accorderie.point.service"]
            .default_get(["sequence"])
            .get("sequence")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_point_service",
            {
                "accorderie": accorderie,
                "page_name": "create_accorderie_point_service",
                "default_accorderie": default_accorderie,
                "default_date_mise_a_jour": default_date_mise_a_jour,
                "default_nom": default_nom,
                "default_sequence": default_sequence,
            },
        )

    @http.route(
        "/submitted/accorderie_point_service",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_point_service(self, **kw):
        vals = {}

        if kw.get("accorderie") and kw.get("accorderie").isdigit():
            vals["accorderie"] = int(kw.get("accorderie"))

        if kw.get("date_mise_a_jour"):
            vals["date_mise_a_jour"] = kw.get("date_mise_a_jour")

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        if kw.get("sequence"):
            sequence_value = kw.get("sequence")
            if sequence_value.isdigit():
                vals["sequence"] = int(sequence_value)

        new_accorderie_point_service = (
            request.env["accorderie.point.service"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_point_service/{new_accorderie_point_service.id}"
        )

    @http.route(
        "/new/accorderie_provenance", type="http", auth="user", website=True
    )
    def create_new_accorderie_provenance(self, **kw):
        default_nom = (
            http.request.env["accorderie.provenance"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_provenance",
            {
                "page_name": "create_accorderie_provenance",
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_provenance",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_provenance(self, **kw):
        vals = {}

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_provenance = (
            request.env["accorderie.provenance"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_provenance/{new_accorderie_provenance.id}"
        )

    @http.route(
        "/new/accorderie_quartier", type="http", auth="user", website=True
    )
    def create_new_accorderie_quartier(self, **kw):
        arrondissement = http.request.env["accorderie.arrondissement"].search(
            []
        )
        default_arrondissement = (
            http.request.env["accorderie.quartier"]
            .default_get(["arrondissement"])
            .get("arrondissement")
        )
        default_nom = (
            http.request.env["accorderie.quartier"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_quartier",
            {
                "arrondissement": arrondissement,
                "page_name": "create_accorderie_quartier",
                "default_arrondissement": default_arrondissement,
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_quartier",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_quartier(self, **kw):
        vals = {}

        if kw.get("arrondissement") and kw.get("arrondissement").isdigit():
            vals["arrondissement"] = int(kw.get("arrondissement"))

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_quartier = (
            request.env["accorderie.quartier"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_quartier/{new_accorderie_quartier.id}"
        )

    @http.route(
        "/new/accorderie_region", type="http", auth="user", website=True
    )
    def create_new_accorderie_region(self, **kw):
        default_code = (
            http.request.env["accorderie.region"]
            .default_get(["code"])
            .get("code")
        )
        default_nom = (
            http.request.env["accorderie.region"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_region",
            {
                "page_name": "create_accorderie_region",
                "default_code": default_code,
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_region",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_region(self, **kw):
        vals = {}

        if kw.get("code"):
            code_value = kw.get("code")
            if code_value.isdigit():
                vals["code"] = int(code_value)

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_region = (
            request.env["accorderie.region"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_region/{new_accorderie_region.id}"
        )

    @http.route(
        "/new/accorderie_revenu_familial",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_revenu_familial(self, **kw):
        default_nom = (
            http.request.env["accorderie.revenu.familial"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_revenu_familial",
            {
                "page_name": "create_accorderie_revenu_familial",
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_revenu_familial",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_revenu_familial(self, **kw):
        vals = {}

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_revenu_familial = (
            request.env["accorderie.revenu.familial"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_revenu_familial/{new_accorderie_revenu_familial.id}"
        )

    @http.route(
        "/new/accorderie_situation_maison",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_situation_maison(self, **kw):
        default_nom = (
            http.request.env["accorderie.situation.maison"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_situation_maison",
            {
                "page_name": "create_accorderie_situation_maison",
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_situation_maison",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_situation_maison(self, **kw):
        vals = {}

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_situation_maison = (
            request.env["accorderie.situation.maison"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_situation_maison/{new_accorderie_situation_maison.id}"
        )

    @http.route(
        "/new/accorderie_type_communication",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_type_communication(self, **kw):
        default_nom = (
            http.request.env["accorderie.type.communication"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_type_communication",
            {
                "page_name": "create_accorderie_type_communication",
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_type_communication",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_type_communication(self, **kw):
        vals = {}

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_type_communication = (
            request.env["accorderie.type.communication"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_type_communication/{new_accorderie_type_communication.id}"
        )

    @http.route(
        "/new/accorderie_type_compte", type="http", auth="user", website=True
    )
    def create_new_accorderie_type_compte(self, **kw):
        default_accordeur_simple = (
            http.request.env["accorderie.type.compte"]
            .default_get(["accordeur_simple"])
            .get("accordeur_simple")
        )
        default_admin = (
            http.request.env["accorderie.type.compte"]
            .default_get(["admin"])
            .get("admin")
        )
        default_admin_chef = (
            http.request.env["accorderie.type.compte"]
            .default_get(["admin_chef"])
            .get("admin_chef")
        )
        default_admin_ord_point_service = (
            http.request.env["accorderie.type.compte"]
            .default_get(["admin_ord_point_service"])
            .get("admin_ord_point_service")
        )
        default_admin_point_service = (
            http.request.env["accorderie.type.compte"]
            .default_get(["admin_point_service"])
            .get("admin_point_service")
        )
        membre = http.request.env["accorderie.membre"].search(
            [("active", "=", True)]
        )
        default_membre = (
            http.request.env["accorderie.type.compte"]
            .default_get(["membre"])
            .get("membre")
        )
        default_nom_complet = (
            http.request.env["accorderie.type.compte"]
            .default_get(["nom_complet"])
            .get("nom_complet")
        )
        default_reseau = (
            http.request.env["accorderie.type.compte"]
            .default_get(["reseau"])
            .get("reseau")
        )
        default_spip = (
            http.request.env["accorderie.type.compte"]
            .default_get(["spip"])
            .get("spip")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_type_compte",
            {
                "membre": membre,
                "page_name": "create_accorderie_type_compte",
                "default_accordeur_simple": default_accordeur_simple,
                "default_admin": default_admin,
                "default_admin_chef": default_admin_chef,
                "default_admin_ord_point_service": default_admin_ord_point_service,
                "default_admin_point_service": default_admin_point_service,
                "default_membre": default_membre,
                "default_nom_complet": default_nom_complet,
                "default_reseau": default_reseau,
                "default_spip": default_spip,
            },
        )

    @http.route(
        "/submitted/accorderie_type_compte",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_type_compte(self, **kw):
        vals = {}

        default_accordeur_simple = (
            http.request.env["accorderie.type.compte"]
            .default_get(["accordeur_simple"])
            .get("accordeur_simple")
        )
        if kw.get("accordeur_simple"):
            vals["accordeur_simple"] = kw.get("accordeur_simple") == "True"
        elif default_accordeur_simple:
            vals["accordeur_simple"] = False

        default_admin = (
            http.request.env["accorderie.type.compte"]
            .default_get(["admin"])
            .get("admin")
        )
        if kw.get("admin"):
            vals["admin"] = kw.get("admin") == "True"
        elif default_admin:
            vals["admin"] = False

        default_admin_chef = (
            http.request.env["accorderie.type.compte"]
            .default_get(["admin_chef"])
            .get("admin_chef")
        )
        if kw.get("admin_chef"):
            vals["admin_chef"] = kw.get("admin_chef") == "True"
        elif default_admin_chef:
            vals["admin_chef"] = False

        default_admin_ord_point_service = (
            http.request.env["accorderie.type.compte"]
            .default_get(["admin_ord_point_service"])
            .get("admin_ord_point_service")
        )
        if kw.get("admin_ord_point_service"):
            vals["admin_ord_point_service"] = (
                kw.get("admin_ord_point_service") == "True"
            )
        elif default_admin_ord_point_service:
            vals["admin_ord_point_service"] = False

        default_admin_point_service = (
            http.request.env["accorderie.type.compte"]
            .default_get(["admin_point_service"])
            .get("admin_point_service")
        )
        if kw.get("admin_point_service"):
            vals["admin_point_service"] = (
                kw.get("admin_point_service") == "True"
            )
        elif default_admin_point_service:
            vals["admin_point_service"] = False

        if kw.get("membre") and kw.get("membre").isdigit():
            vals["membre"] = int(kw.get("membre"))

        if kw.get("nom_complet"):
            vals["nom_complet"] = kw.get("nom_complet")

        default_reseau = (
            http.request.env["accorderie.type.compte"]
            .default_get(["reseau"])
            .get("reseau")
        )
        if kw.get("reseau"):
            vals["reseau"] = kw.get("reseau") == "True"
        elif default_reseau:
            vals["reseau"] = False

        default_spip = (
            http.request.env["accorderie.type.compte"]
            .default_get(["spip"])
            .get("spip")
        )
        if kw.get("spip"):
            vals["spip"] = kw.get("spip") == "True"
        elif default_spip:
            vals["spip"] = False

        new_accorderie_type_compte = (
            request.env["accorderie.type.compte"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_type_compte/{new_accorderie_type_compte.id}"
        )

    @http.route(
        "/new/accorderie_type_fichier", type="http", auth="user", website=True
    )
    def create_new_accorderie_type_fichier(self, **kw):
        default_date_mise_a_jour = (
            http.request.env["accorderie.type.fichier"]
            .default_get(["date_mise_a_jour"])
            .get("date_mise_a_jour")
        )
        default_nom = (
            http.request.env["accorderie.type.fichier"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_type_fichier",
            {
                "page_name": "create_accorderie_type_fichier",
                "default_date_mise_a_jour": default_date_mise_a_jour,
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_type_fichier",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_type_fichier(self, **kw):
        vals = {}

        if kw.get("date_mise_a_jour"):
            vals["date_mise_a_jour"] = kw.get("date_mise_a_jour")

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_type_fichier = (
            request.env["accorderie.type.fichier"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_type_fichier/{new_accorderie_type_fichier.id}"
        )

    @http.route(
        "/new/accorderie_type_service", type="http", auth="user", website=True
    )
    def create_new_accorderie_type_service(self, **kw):
        default_active = (
            http.request.env["accorderie.type.service"]
            .default_get(["active"])
            .get("active")
        )
        default_approuve = (
            http.request.env["accorderie.type.service"]
            .default_get(["approuve"])
            .get("approuve")
        )
        default_description = (
            http.request.env["accorderie.type.service"]
            .default_get(["description"])
            .get("description")
        )
        default_identifiant = (
            http.request.env["accorderie.type.service"]
            .default_get(["identifiant"])
            .get("identifiant")
        )
        default_nom = (
            http.request.env["accorderie.type.service"]
            .default_get(["nom"])
            .get("nom")
        )
        default_nom_complet = (
            http.request.env["accorderie.type.service"]
            .default_get(["nom_complet"])
            .get("nom_complet")
        )
        default_numero = (
            http.request.env["accorderie.type.service"]
            .default_get(["numero"])
            .get("numero")
        )
        sous_categorie_id = http.request.env[
            "accorderie.type.service.sous.categorie"
        ].search([("active", "=", True)])
        default_sous_categorie_id = (
            http.request.env["accorderie.type.service"]
            .default_get(["sous_categorie_id"])
            .get("sous_categorie_id")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_type_service",
            {
                "sous_categorie_id": sous_categorie_id,
                "page_name": "create_accorderie_type_service",
                "default_active": default_active,
                "default_approuve": default_approuve,
                "default_description": default_description,
                "default_identifiant": default_identifiant,
                "default_nom": default_nom,
                "default_nom_complet": default_nom_complet,
                "default_numero": default_numero,
                "default_sous_categorie_id": default_sous_categorie_id,
            },
        )

    @http.route(
        "/submitted/accorderie_type_service",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_type_service(self, **kw):
        vals = {}

        default_active = (
            http.request.env["accorderie.type.service"]
            .default_get(["active"])
            .get("active")
        )
        if kw.get("active"):
            vals["active"] = kw.get("active") == "True"
        elif default_active:
            vals["active"] = False

        default_approuve = (
            http.request.env["accorderie.type.service"]
            .default_get(["approuve"])
            .get("approuve")
        )
        if kw.get("approuve"):
            vals["approuve"] = kw.get("approuve") == "True"
        elif default_approuve:
            vals["approuve"] = False

        if kw.get("description"):
            vals["description"] = kw.get("description")

        if kw.get("identifiant"):
            vals["identifiant"] = kw.get("identifiant")

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        if kw.get("nom_complet"):
            vals["nom_complet"] = kw.get("nom_complet")

        if kw.get("numero"):
            numero_value = kw.get("numero")
            if numero_value.isdigit():
                vals["numero"] = int(numero_value)

        if (
            kw.get("sous_categorie_id")
            and kw.get("sous_categorie_id").isdigit()
        ):
            vals["sous_categorie_id"] = int(kw.get("sous_categorie_id"))

        new_accorderie_type_service = (
            request.env["accorderie.type.service"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_type_service/{new_accorderie_type_service.id}"
        )

    @http.route(
        "/new/accorderie_type_service_categorie",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_type_service_categorie(self, **kw):
        default_active = (
            http.request.env["accorderie.type.service.categorie"]
            .default_get(["active"])
            .get("active")
        )
        default_approuve = (
            http.request.env["accorderie.type.service.categorie"]
            .default_get(["approuve"])
            .get("approuve")
        )
        default_nocategorie = (
            http.request.env["accorderie.type.service.categorie"]
            .default_get(["nocategorie"])
            .get("nocategorie")
        )
        default_nom = (
            http.request.env["accorderie.type.service.categorie"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_type_service_categorie",
            {
                "page_name": "create_accorderie_type_service_categorie",
                "default_active": default_active,
                "default_approuve": default_approuve,
                "default_nocategorie": default_nocategorie,
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_type_service_categorie",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_type_service_categorie(self, **kw):
        vals = {}

        default_active = (
            http.request.env["accorderie.type.service.categorie"]
            .default_get(["active"])
            .get("active")
        )
        if kw.get("active"):
            vals["active"] = kw.get("active") == "True"
        elif default_active:
            vals["active"] = False

        default_approuve = (
            http.request.env["accorderie.type.service.categorie"]
            .default_get(["approuve"])
            .get("approuve")
        )
        if kw.get("approuve"):
            vals["approuve"] = kw.get("approuve") == "True"
        elif default_approuve:
            vals["approuve"] = False

        if kw.get("icon"):
            lst_file_icon = request.httprequest.files.getlist("icon")
            if lst_file_icon:
                vals["icon"] = base64.b64encode(lst_file_icon[-1].read())

        if kw.get("nocategorie"):
            nocategorie_value = kw.get("nocategorie")
            if nocategorie_value.isdigit():
                vals["nocategorie"] = int(nocategorie_value)

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_type_service_categorie = (
            request.env["accorderie.type.service.categorie"]
            .sudo()
            .create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_type_service_categorie/{new_accorderie_type_service_categorie.id}"
        )

    @http.route(
        "/new/accorderie_type_service_sous_categorie",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_type_service_sous_categorie(self, **kw):
        default_active = (
            http.request.env["accorderie.type.service.sous.categorie"]
            .default_get(["active"])
            .get("active")
        )
        default_approuver = (
            http.request.env["accorderie.type.service.sous.categorie"]
            .default_get(["approuver"])
            .get("approuver")
        )
        categorie = http.request.env[
            "accorderie.type.service.categorie"
        ].search([("active", "=", True)])
        default_categorie = (
            http.request.env["accorderie.type.service.sous.categorie"]
            .default_get(["categorie"])
            .get("categorie")
        )
        default_nom = (
            http.request.env["accorderie.type.service.sous.categorie"]
            .default_get(["nom"])
            .get("nom")
        )
        default_sous_categorie_service = (
            http.request.env["accorderie.type.service.sous.categorie"]
            .default_get(["sous_categorie_service"])
            .get("sous_categorie_service")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_type_service_sous_categorie",
            {
                "categorie": categorie,
                "page_name": "create_accorderie_type_service_sous_categorie",
                "default_active": default_active,
                "default_approuver": default_approuver,
                "default_categorie": default_categorie,
                "default_nom": default_nom,
                "default_sous_categorie_service": default_sous_categorie_service,
            },
        )

    @http.route(
        "/submitted/accorderie_type_service_sous_categorie",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_type_service_sous_categorie(self, **kw):
        vals = {}

        default_active = (
            http.request.env["accorderie.type.service.sous.categorie"]
            .default_get(["active"])
            .get("active")
        )
        if kw.get("active"):
            vals["active"] = kw.get("active") == "True"
        elif default_active:
            vals["active"] = False

        default_approuver = (
            http.request.env["accorderie.type.service.sous.categorie"]
            .default_get(["approuver"])
            .get("approuver")
        )
        if kw.get("approuver"):
            vals["approuver"] = kw.get("approuver") == "True"
        elif default_approuver:
            vals["approuver"] = False

        if kw.get("categorie") and kw.get("categorie").isdigit():
            vals["categorie"] = int(kw.get("categorie"))

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        if kw.get("sous_categorie_service"):
            vals["sous_categorie_service"] = kw.get("sous_categorie_service")

        new_accorderie_type_service_sous_categorie = (
            request.env["accorderie.type.service.sous.categorie"]
            .sudo()
            .create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_type_service_sous_categorie/{new_accorderie_type_service_sous_categorie.id}"
        )

    @http.route(
        "/new/accorderie_type_telephone",
        type="http",
        auth="user",
        website=True,
    )
    def create_new_accorderie_type_telephone(self, **kw):
        default_nom = (
            http.request.env["accorderie.type.telephone"]
            .default_get(["nom"])
            .get("nom")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_type_telephone",
            {
                "page_name": "create_accorderie_type_telephone",
                "default_nom": default_nom,
            },
        )

    @http.route(
        "/submitted/accorderie_type_telephone",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_type_telephone(self, **kw):
        vals = {}

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        new_accorderie_type_telephone = (
            request.env["accorderie.type.telephone"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_type_telephone/{new_accorderie_type_telephone.id}"
        )

    @http.route(
        "/new/accorderie_ville", type="http", auth="user", website=True
    )
    def create_new_accorderie_ville(self, **kw):
        default_code = (
            http.request.env["accorderie.ville"]
            .default_get(["code"])
            .get("code")
        )
        default_nom = (
            http.request.env["accorderie.ville"]
            .default_get(["nom"])
            .get("nom")
        )
        region = http.request.env["accorderie.region"].search([])
        default_region = (
            http.request.env["accorderie.ville"]
            .default_get(["region"])
            .get("region")
        )
        return http.request.render(
            "accorderie_canada_ddb.portal_create_accorderie_ville",
            {
                "region": region,
                "page_name": "create_accorderie_ville",
                "default_code": default_code,
                "default_nom": default_nom,
                "default_region": default_region,
            },
        )

    @http.route(
        "/submitted/accorderie_ville",
        type="http",
        auth="user",
        website=True,
        csrf=True,
    )
    def submit_accorderie_ville(self, **kw):
        vals = {}

        if kw.get("code"):
            code_value = kw.get("code")
            if code_value.isdigit():
                vals["code"] = int(code_value)

        if kw.get("nom"):
            vals["nom"] = kw.get("nom")

        if kw.get("region") and kw.get("region").isdigit():
            vals["region"] = int(kw.get("region"))

        new_accorderie_ville = (
            request.env["accorderie.ville"].sudo().create(vals)
        )
        return werkzeug.utils.redirect(
            f"/my/accorderie_ville/{new_accorderie_ville.id}"
        )
