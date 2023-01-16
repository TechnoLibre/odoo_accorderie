# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "Accorderie migrate mysql",
    "version": "12.0.0.1",
    "author": "TechnoLibre",
    "website": "https://technolibre.ca",
    "license": "AGPL-3",
    "category": "Extra tools",
    "summary": "Migrate database of project Accorderie",
    "description": """
Accorderie migrate mysql
========================

Be sure .cache is deleted before installed.
""",
    "depends": [
        # 'l10n_ca_qc',
        "erplibre_base",
        "erplibre_base_quebec",
        "crm",
        "project",
        # "sale",
        # "stock",
        # "hr",
        "partner_fax",
        "website",
        "website_livechat",
        "im_livechat",
        "muk_web_theme",
        # Document
        "muk_dms",
        "muk_dms_mail",
        "muk_dms_thumbnails",
        "muk_dms_view",
        "membership",
        "membership_extension",
        # "fieldservice",
        # "fieldservice_skill",
        # "helpdesk_mgmt",
        # "hr_timesheet",
        "accorderie_prod",
    ],
    "external_dependencies": {
        "python": [
            "MySQLdb",
        ],
    },
    "data": [
        "data/accorderie_web_data.xml",
    ],
    "post_init_hook": "post_init_hook",
    "installable": True,
}
