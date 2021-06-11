/*************/
/* Annuaires */
/*************/

/* Le but est de télécharger l'édition de l'annuaire 
en fonction de la sélection de l'utilisateur dans 
la liste déroulante */
jQuery(document).ready(function(){
    jQuery('#edition-select').on('change', function (){
        var url = jQuery(this).val(); // get selected value
            if (url) { // require a URL
                window.location = url; // redirect
            }
        return false;
    });
});

/*********************/
/* Liste des acteurs */
/*********************/

/* Le but est de filtrer la liste des acteurs  
en fonction de la catégorie sélectionnée par
l'utilisateur dans la liste déroulante */
jQuery(document).ready(function(){
    jQuery('#liste-categorie').on('change', function (){
        var url = jQuery(this).val(); // get selected value
            if (url) { // require a URL
                window.location = url; // redirect
            }
        return false;
    });
});

/****************/
/* Page acteur */
/***************/

/* Modification du titre de la page pour y intégrer le nom de l'acteur */
if(document.title == 'Acteur – Le Florain') {
    document.title = document.getElementsByClassName('titre  flex-value')[0].textContent + ' - Acteur - Le FLorain';
}

