from odoo import _, api, fields, models


class AccorderiePointService(models.Model):
    _name = "accorderie.point.service"
    _description = "Accorderie Point Service"
    _rec_name = "nom"

    nom = fields.Char(help="Nom du point de service")

    accorderie = fields.Many2one(
        comodel_name="accorderie.accorderie",
        required=True,
    )

    commentaire = fields.One2many(
        comodel_name="accorderie.commentaire",
        inverse_name="point_service",
        help="Commentaire relation",
    )

    membre = fields.One2many(
        comodel_name="accorderie.membre",
        inverse_name="point_service",
        help="Membre relation",
    )

    sequence = fields.Integer(
        string="Séquence",
        help="Séquence d'affichage",
    )
