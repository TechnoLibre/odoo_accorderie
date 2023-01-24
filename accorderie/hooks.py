# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import base64
import logging

from odoo import SUPERUSER_ID, _, api, tools

_logger = logging.getLogger(__name__)


def pre_init_hook(cr):
    with api.Environment.manage():
        env = api.Environment(cr, SUPERUSER_ID, {})

        # Update all partner
        partners = env["res.partner"].search([("name", "=", "My Company")])
        for partner in partners:
            partner.website = "https://accorderie.ca"
            partner.name = "Accorderie"
            partner.email = "reseau@accorderie.ca"
            partner.street = "160, rue St-Joseph Est"
            partner.city = "Québec"
            partner.zip = "G1K 3A7"
            partner.country_id = env.ref("base.ca")
            partner.state_id = env["res.country.state"].search(
                [("code", "ilike", "QC")], limit=1
            )
            partner.phone = "(418) 524-2597"

        company_id = env["res.company"].browse(1)
        company_id.sequence = 1

        partners = env["res.partner"].search([("name", "=", "Administrator")])
        for partner in partners:
            partner.website = "https://technolibre.ca"
            partner.name = "Mathieu Benoit"
            partner.email = "mathieu.benoit@technolibre.ca"
            partner.country_id = env.ref("base.ca")
            partner.state_id = env["res.country.state"].search(
                [("code", "ilike", "QC")], limit=1
            )


def post_init_hook(cr, e):
    with api.Environment.manage():
        env = api.Environment(cr, SUPERUSER_ID, {})

        # Update all partner
        partners = env["res.partner"].search([("name", "=", "Accorderie")])
        for partner in partners:
            partner_img_attachment = env.ref(
                "accorderie.ir_attachment_logo_reseau_accorderie_png"
            )
            with tools.file_open(
                partner_img_attachment.local_url[1:], "rb"
            ) as desc_file:
                partner.image = base64.b64encode(desc_file.read())
