from odoo import _, api, fields, models


class AccorderieDemandeAdhesion(models.Model):
    _inherit = "accorderie.demande.adhesion"
    _description = "Accorderie Demande Adhesion DEMO"

    @api.model_create_multi
    def create(self, vals_list):
        vals = super(AccorderieDemandeAdhesion, self).create(vals_list)
        # Automatic accept, create member
        if (
            self.env["ir.config_parameter"]
            .sudo()
            .get_param("accorderie.accorderie_auto_accept_adhesion")
        ):
            # TODO move this into accorderie, do refactoring (merge partner and member), add configuration
            lst_data = []
            for val in vals:
                data = {
                    "accorderie": val.accorderie.id,
                    "profil_approuver": True,
                    "nom": val.nom,
                    # "prenom": val.prenom,
                    "user_id": val.user_id.id,
                    "partner_id": val.user_id.partner_id.id,
                    "region": self.env.ref(
                        "accorderie_data.accorderie_region_saguenay_lac_saint_jean"
                    ).id,
                    "ville": self.env.ref(
                        "accorderie_data.accorderie_ville_sainte_rose_du_nord"
                    ).id,
                }
                lst_data.append(data)
            membre_ids = self.env["accorderie.membre"].create(lst_data)
            # Force add initial time
            lst_data = []
            for membre_id in membre_ids:
                data = {
                    "date_echange": fields.Datetime.now(),
                    "nb_heure": 15,
                    "type_echange": "offre_ponctuel",
                    "transaction_valide": True,
                    "membre_acheteur": self.env.ref(
                        "demo_accorderie.accorderie_membre_accorderie_laval"
                    ).id,
                    "membre_vendeur": membre_id.id,
                }
                lst_data.append(data)
            self.env["accorderie.echange.service"].create(lst_data)
        return vals
