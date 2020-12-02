# -*- coding: utf-8 -*-

from odoo import _, api, models, fields


class TestModelPortal(models.Model):
    _inherit = 'portal.mixin'
    _name = 'test.model.portal'
    _description = 'test_model_portal'

    banana = fields.Boolean(
        string='Banana test',
    )

    name = fields.Char(
        string='Name',
    )
