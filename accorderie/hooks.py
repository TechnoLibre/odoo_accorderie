# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import base64
import logging

from odoo import SUPERUSER_ID, _, api, tools

_logger = logging.getLogger(__name__)


def pre_init_hook(cr):
    with api.Environment.manage():
        env = api.Environment(cr, SUPERUSER_ID, {})

        company_id = env["res.partner"].browse(env.ref("base.main_company").id)
        company_id.website = "https://accorderie.ca"
        company_id.name = "Accorderie"
        company_id.email = "reseau@accorderie.ca"
        company_id.street = "160, rue St-Joseph Est"
        company_id.city = "Québec"
        company_id.zip = "G1K 3A7"
        company_id.country_id = env.ref("base.ca")
        company_id.state_id = env["res.country.state"].search(
            [("code", "ilike", "QC")], limit=1
        )
        company_id.phone = "(418) 524-2597"
        company_id.sequence = 1

        user_admin_id = env["res.partner"].browse(
            env.ref("base.partner_admin").id
        )
        user_admin_id.website = "https://technolibre.ca"
        user_admin_id.name = "Mathieu Benoit"
        user_admin_id.email = "mathieu.benoit@technolibre.ca"
        user_admin_id.country_id = env.ref("base.ca")
        user_admin_id.state_id = env["res.country.state"].search(
            [("code", "ilike", "QC")], limit=1
        )


def post_init_hook(cr, e):
    with api.Environment.manage():
        env = api.Environment(cr, SUPERUSER_ID, {})

        partner_id = env["res.partner"].browse(env.ref("base.main_company").id)

        partner_img_attachment = env.ref(
            "accorderie.ir_attachment_logo_reseau_accorderie_png"
        )
        with tools.file_open(
            partner_img_attachment.local_url[1:], "rb"
        ) as desc_file:
            partner_id.image = base64.b64encode(desc_file.read())
