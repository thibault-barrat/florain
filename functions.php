<?php
/**
 * Child theme functions
 *
 * When using a child theme (see http://codex.wordpress.org/Theme_Development
 * and http://codex.wordpress.org/Child_Themes), you can override certain
 * functions (those wrapped in a function_exists() call) by defining them first
 * in your child theme's functions.php file. The child theme's functions.php
 * file is included before the parent theme's file, so the child theme
 * functions would be used.
 *
 * Text Domain: oceanwp
 * @link http://codex.wordpress.org/Plugin_API
 *
 */

/**
 * Load the parent style.css file
 *
 * @link http://codex.wordpress.org/Child_Themes
 */
function oceanwp_child_enqueue_parent_style() {
	// Dynamically get version number of the parent stylesheet (lets browsers re-cache your stylesheet when you update your theme)
	$theme   = wp_get_theme( 'OceanWP' );
	$version = $theme->get( 'Version' );
	// Load the stylesheet
	wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/css/style.min.css', array( 'oceanwp-style' ), $version );
	
	wp_enqueue_script( 'child-script', get_stylesheet_directory_uri() . '/js/main.min.js', array( 'jquery' ), $version, true );
	
	if(is_page_template('page-map.php')){
		wp_enqueue_style('leaflet.css', 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
		wp_enqueue_script('leaflet.js', 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js', array( 'jquery' ), false, true);
		wp_enqueue_script( 'map-script', get_stylesheet_directory_uri() . '/js/map.min.js', array( 'jquery' ), $version, true );
	}
	
}
add_action( 'wp_enqueue_scripts', 'oceanwp_child_enqueue_parent_style' );


/**
 *  Charger le script spécifique aux pages 
 * admin.php?page=participants-database-add_participant 
 * et admin.php?page=participants-database-edit_participant 
 */

function admin_participants_form_script($hook) {

	if ( 'base-de-donnees-des-participants_page_participants-database-add_participant' != $hook && 'admin_page_participants-database-edit_participant' != $hook) {
		return;
	}
	$theme   = wp_get_theme( 'OceanWP' );
	$version = $theme->get( 'Version' );
	wp_enqueue_script( 'admin-participants-form-script', get_stylesheet_directory_uri() . '/js/admin-participants-form.min.js', array(), $version, true );
  }
  add_action('admin_enqueue_scripts', 'admin_participants_form_script');


/**
 * Créer les fichiers geojson à chaque édition ou création d'un acteur
 */

 require_once('inc/acteurs_geojson.php');
 add_action('pdb-after_submit_update', 'acteurs_geojson');
 add_action('pdb-after_submit_add', 'acteurs_geojson');