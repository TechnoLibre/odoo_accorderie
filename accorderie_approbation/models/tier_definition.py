# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, models


class TierDefinition(models.Model):
    _inherit = "tier.definition"
    _state_from = ["draft"]
    _state_to = ["confirmed"]

    @api.model
    def _get_tier_validation_model_names(self):
        res = super(TierDefinition, self)._get_tier_validation_model_names()
        res.append("accorderie.demande.service")
        res.append("accorderie.offre.service")
        return res
