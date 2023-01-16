{
    "name": "Accorderie",
    "category": "Uncategorized",
    "version": "12.0.1.0",
    "author": "TechnoLibre",
    "license": "AGPL-3",
    "application": True,
    "depends": ["mail"],
    "data": [
        "security/ir.model.access.csv",
        "views/accorderie_accorderie.xml",
        "views/accorderie_arrondissement.xml",
        "views/accorderie_commentaire.xml",
        "views/accorderie_demande_adhesion.xml",
        "views/accorderie_demande_service.xml",
        "views/accorderie_droits_admin.xml",
        "views/accorderie_echange_service.xml",
        "views/accorderie_fichier.xml",
        "views/accorderie_membre.xml",
        "views/accorderie_occupation.xml",
        "views/accorderie_offre_service.xml",
        "views/accorderie_origine.xml",
        "views/accorderie_point_service.xml",
        "views/accorderie_provenance.xml",
        "views/accorderie_quartier.xml",
        "views/accorderie_region.xml",
        "views/accorderie_revenu_familial.xml",
        "views/accorderie_situation_maison.xml",
        "views/accorderie_type_communication.xml",
        "views/accorderie_type_compte.xml",
        "views/accorderie_type_fichier.xml",
        "views/accorderie_type_service.xml",
        "views/accorderie_type_service_categorie.xml",
        "views/accorderie_type_service_sous_categorie.xml",
        "views/accorderie_type_telephone.xml",
        "views/accorderie_ville.xml",
        "views/accorderie_workflow.xml",
        "views/accorderie_workflow_relation.xml",
        "views/accorderie_workflow_state.xml",
        "views/res_config_settings_views.xml",
        "views/menu.xml",
        "data/ir_attachment.xml",
    ],
    "pre_init_hook": "pre_init_hook",
    "post_init_hook": "post_init_hook",
    "installable": True,
}
