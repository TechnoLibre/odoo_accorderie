from datetime import datetime

from odoo import _, api, fields, models


class AccorderieOffreService(models.Model):
    _name = "accorderie.offre.service"
    _inherit = "portal.mixin"
    _description = "Accorderie Offre Service"
    _rec_name = "titre"

    titre = fields.Char(
        help="Résumé de l'offre, mise en valeur de la description."
    )

    accompli = fields.Boolean(
        string="Accomplie",
        help="Cette offre de service est réalisée.",
    )

    accorderie = fields.Many2one(
        comodel_name="accorderie.accorderie",
        help="Accorderie associée",
    )

    active = fields.Boolean(
        string="Actif",
        default=True,
        help=(
            "Lorsque non actif, cet offre de services n'est plus en fonction,"
            " mais demeure accessible."
        ),
    )

    approuve = fields.Boolean(
        string="Approuvé",
        help="Permet d'approuver ce type de services.",
    )

    condition = fields.Html(
        string="Conditions",
        help="Conditions inhérentes à l'offre",
    )

    condition_autre = fields.Char(
        string="Condition autres",
        help="Autres conditions à informer",
    )

    date_affichage = fields.Date(string="Date d'affichage")

    date_debut = fields.Date(
        string="Date de début",
        help="Date à partir de laquelle l'offre est valide.",
    )

    date_fin = fields.Date(
        string="Date de fin",
        help="Date jusqu'à laquelle l'offre est valide.",
    )

    date_mise_a_jour = fields.Datetime(
        string="Dernière mise à jour",
        help="Date de la dernière mise à jour",
    )

    description = fields.Html()

    deplacement = fields.Html()

    disponibilite = fields.Char(string="Disponibilité")

    entente_tarifiaire = fields.Html()

    membre = fields.Many2one(
        comodel_name="accorderie.membre",
        help="Membre qui offre le service",
    )

    membre_favoris_ids = fields.Many2many(comodel_name="accorderie.membre")

    nb_consultation = fields.Integer(string="Nombre de consultations")

    nom_offre_special = fields.Char(
        string="Nom de l'offre spéciale",
        help="Nom ou brève description de l'offre spéciale",
    )

    offre_special = fields.Boolean(string="Offre spéciale")

    publie = fields.Boolean(
        string="Offre publié",
        help="L'offre est publiée, sinon il est privée.",
        default=True,
    )

    quoi_apporter = fields.Html()

    tarif = fields.Char()

    type_service_id = fields.Many2one(
        comodel_name="accorderie.type.service",
        string="Type de services",
    )

    @api.multi
    def write(self, vals):
        status = super().write(vals)
        # Detect user
        accorderie_member = (
            self.env["res.users"]
            .browse(self.write_uid.id)
            .partner_id.accorderie_membre_ids
        )
        for rec in self:
            self.env["bus.bus"].sendone(
                # f'["{self._cr.dbname}","{self._name}",{rec.id}]',
                "accorderie.notification.favorite",
                {
                    "timestamp": str(datetime.now()),
                    "data": vals,
                    "field_id": rec.id,
                    "canal": f'["{self._cr.dbname}","{self._name}",{accorderie_member.id}]',
                },
            )
        return status

    def _compute_access_url(self):
        super(AccorderieOffreService, self)._compute_access_url()
        for accorderie_offre_service in self:
            accorderie_offre_service.access_url = (
                "/my/accorderie_offre_service/%s" % accorderie_offre_service.id
            )
