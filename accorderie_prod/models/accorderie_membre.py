from odoo import _, api, fields, models


class AccorderieMembre(models.Model):
    _inherit = "accorderie.membre"

    company_id = fields.Many2one(
        comodel_name="res.company",
        string="Company",
        related="point_service.company_id",
    )

    partner_id = fields.Many2one(
        comodel_name="res.partner",
        string="Partner",
    )

    nom = fields.Char(
        related="partner_id.name",
        readonly=False,
    )

    active = fields.Boolean(
        related="partner_id.active",
        readonly=False,
    )

    adresse = fields.Char(
        related="partner_id.street",
        readonly=False,
    )

    codepostal = fields.Char(
        related="partner_id.zip",
        readonly=False,
    )

    logo = fields.Binary(
        related="partner_id.image",
        readonly=False,
    )

    telephone1 = fields.Char(
        related="partner_id.phone",
        readonly=False,
    )

    courriel = fields.Char(
        related="partner_id.email",
        readonly=False,
    )
