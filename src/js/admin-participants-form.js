/*****************************/
/* Formulaire acteur (admin) */
/*****************************/

/* Afficher/cacher et remplir le champ "sous catégorie" en fonction de la catégorie choisie */

//nom du champ parent
var parent = 'categorie';

//nom du champ enfant
var child = 'sous_categorie';

//sélection de la liste déroulante parent
var parentSelect = document.querySelector('select[name='+parent+']');

//sélection de la liste déroulante enfant
var childSelect = document.querySelector('select[name='+child+']');

//nous aurons besoin de la valeur initiale du champ enfant
var childValue = "";

//fonction pour remettre à zéro la liste déroualtne enfant et cacher tous les optgroups
const clearChild = () => {
    //on sauvegarde la valeur enfant
    childValue = childSelect.value;
    //on efface les enfants
    childSelect.value = '';
    childSelect.querySelectorAll('optgroup').forEach(function(element){
        element.style.display = 'none';
    });
    //on cache le champ enfant
    childSelect.parentNode.parentNode.style.display = 'none';
}

//on effectue les opérations à chaque changement de la liste déroulante parent
parentSelect.addEventListener('change', function(e) {
    //on cache les options qui étaient visibles avant
    clearChild();

    //on identifie le groupe qui est sélectionné
    var selection = e.target.value;

    //on vérifie que la sélection n'est pas vide
    if (selection !='') {

        //on trouve le optgroup correspondant dans la liste déroulante enfant
        var childGroup = childSelect.querySelector('optgroup[label*="'+selection+'"]');

        //on trouve les options du optgroup
        var options = childGroup.querySelectorAll('option');

        //on rend ce groupe visible 
        childGroup.style.display = 'inherit';

    }

    //si la valeur enfant est dans le optgroup visible, on la sélectionne. Si la valeur parent est égale à une des valeurs enfants, on la sélectionne et on cache le champ enfant
    if (childValue != '' && window.getComputedStyle(childSelect.querySelector('option[value="' + childValue + '"]').parentNode).display != 'none') {
        childSelect.value = childValue;
    } else if (typeof childGroup !== 'undefined') {
        options.forEach(function(element){
            if (parentSelect.value == element.value) {
                childSelect.value = element.value;
            }
        });
    } else {
        childSelect.value = '';
    } 

    //on affiche le champ enfant si le optgroup a plus d'un enfant
    if(options.length > 1) {
        childSelect.parentNode.parentNode.style.display = 'table-row';
    }
})

//on effectue les opérations dès le chargement en forçant un événement change
parentSelect.dispatchEvent(new Event('change'));

/* Afficher/cacher le champ "Comptoir message" si l'acteur est un comptoir ou non */

comptoirBool = document.getElementById("pdb-comptoir-1");
messageComptoir = document.getElementsByClassName("message_comptoir-field")[0];

const hideShowElementFromCheckbox = (element, checkbox) => {
	if (checkbox.checked) {
        element.style.display = "table-row";
    } else {
        element.style.display = "none";
    }
}

hideShowElementFromCheckbox(messageComptoir, comptoirBool);

comptoirBool.addEventListener('change', function() {
    hideShowElementFromCheckbox(messageComptoir, comptoirBool);
  });

