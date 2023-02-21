from odoo import _, api, fields, models


class AccorderiePointService(models.Model):
    _name = "accorderie.point.service"
    _description = "Accorderie Point Service"
    _rec_name = "nom"

    nom = fields.Char(
        help="Nom du point de service",
        related="company_id.name",
        readonly=False,
    )

    accorderie = fields.Many2one(
        comodel_name="accorderie.accorderie",
        required=True,
    )

    commentaire = fields.One2many(
        comodel_name="accorderie.commentaire",
        inverse_name="point_service",
        help="Commentaire relation",
    )

    company_id = fields.Many2one(
        comodel_name="res.company",
        string="Company",
    )

    membre = fields.One2many(
        comodel_name="accorderie.membre",
        inverse_name="point_service",
        help="Membre relation",
    )

    partner_id = fields.Many2one(
        comodel_name="res.partner",
        string="Partner",
        related="company_id.partner_id",
    )

    sequence = fields.Integer(
        string="Séquence",
        help="Séquence d'affichage",
    )
