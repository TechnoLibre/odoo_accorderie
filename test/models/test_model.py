# -*- coding: utf-8 -*-

from odoo import api, models, fields


class TestModel(models.Model):
    _name = 'test.model'
    _description = 'test_model'

    name = fields.Char(
        string='Name',
        copy=False,
    )

    variable_1 = fields.Boolean(
        string='Variable',
    )
