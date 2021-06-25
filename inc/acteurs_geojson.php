<?php
/**
 * Convert MySQL data to GeoJSON
 */

 # Function to convert an array in utf8 (necessary to use json_encode)
 function utf8_converter($array)
 {
     array_walk_recursive($array, function(&$item, $key){
         if(!mb_detect_encoding($item, 'utf-8', true)){
                 $item = utf8_encode($item);
         }
     });
 
     return $array;
 }

 # Function to get a JSON from an address with the API adresse.data.gouv.fr
 function donnees_adresse($adresse)
 {
     $adresse2 = str_replace(' ','+',strtolower($adresse));
 
     $ch       = curl_init("http://api-adresse.data.gouv.fr/search/?q=$adresse2");
     curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "GET");
     curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
     curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
     curl_setopt($ch, CURLOPT_TIMEOUT, 5);
     curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
     curl_setopt($ch,CURLOPT_HEADER,0);
     $json     = curl_exec($ch);
     curl_close($ch);
 
     return $json;
 }

function acteurs_geojson() {

    # Connect to MySQL database
    $servername = DB_HOST;
    $username = DB_USER;
    $password = DB_PASSWORD;
    $dbname = DB_NAME;
    global $wpdb;
    $table_prefix = $wpdb->prefix;
    $tablename = $table_prefix . "participants_database";

    #Choose the sub category
    $scat= array("Épiceries","Producteurs","Paysans Boulangers et Boulangers","AMAP","Traiteurs","Se restaurer et boire un verre","Associations d'éducation populaire","Se cultiver - se divertir - se détendre","Tourisme - Vacances - WE","Prendre soin de soi","S'habiller - s'équiper","Se déplacer","Se meubler - décorer - aménager","Et aussi...","S'engager", "Marchés", "Brasseries");

    $comptoir = array("oui", "");

    try {
        $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password, array(PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8'));
        // set the PDO error mode to exception
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "Connected successfully !!";
        }
    catch(PDOException $e)
        {
        echo "Connection failed: " . $e->getMessage();
        }

    for ($j = 0; $j<=1; $j++) {    
        for ($i = 0; $i<=16; $i++) {
            # Build SQL SELECT statement including x and y columns
            $sql = 'SELECT titre, categorie, sous_categorie, site_web, description_courte, description_longue, adresse, code_postal, ville, telephone, horaires, citation, comptoir, message_comptoir, labels, id, présence_sur_les_marchés, inactif, image, longitude AS x, latitude AS y FROM ' . $tablename .  ' WHERE sous_categorie="' . $scat[$i] . '" AND comptoir ="' . $comptoir[$j] . '"';
            # Try query or error
            try {
                $rs = $conn->query($sql);
                if (!$rs) {
                    echo 'An SQL error occured.\n';
                    exit;
                }
                }
            catch(PDOException $e)
                {
                echo "Query failed: " . $e->getMessage();
                }
            
            
            # Try query or error
            
            # Build GeoJSON feature collection array
            $geojson = array(
                'type'      => 'FeatureCollection',
                'features'  => array()
            );

            # Loop through rows to build feature arrays
            while ($row = $rs->fetch(PDO::FETCH_ASSOC)) {
                $properties = $row;
                if($properties['inactif']!='true') {

                    # Remove some fields from properties (optional)
                    unset($properties['x']);
                    unset($properties['y']);     

                    # Modify properties "présence_sur_les_marchés"
                    if($properties['présence_sur_les_marchés']!= null && trim($properties['présence_sur_les_marchés'])!= '')
                    {
                        $charPosition = strpos($properties['présence_sur_les_marchés'],'"') + 1;
                        $marches = substr_replace($properties['présence_sur_les_marchés'],'',0,$charPosition);
                        $marches = substr_replace($marches,'',-3);
                        $marches = explode(', ', $marches);
                        foreach($marches as $key => $marche) {
                            $sql = 'SELECT id FROM ' . $tablename . ' WHERE inactif!="true" AND titre="' . $marche . '"';
                            $id = $conn->query($sql)->fetch(PDO::FETCH_ASSOC);
                            $marches[$key] = array(
                                'id' => $id['id'],
                                'titre' => $marche
                            );
                        }
                        $properties['présence_sur_les_marchés'] = $marches;
                    }

                    #Add specific property for the categorie "Marchés"
                    if($properties['categorie'] == "Marchés") {
                        $sql = 'SELECT id, titre FROM ' . $tablename . ' WHERE inactif!="true" AND présence_sur_les_marchés LIKE "%' . $properties['titre'] . '%"';
                        $result = $conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                        $properties['acteurs_presents'] = $result;
                    }

                    # Add latitude and longitude to the table if they are not
                    if (($row['x']==null OR  $row['x']=='' OR $row['y']==null OR  $row['y']=='') AND $row['adresse']!="" AND $row['code_postal']!="" AND $row['ville']!="")
                    {
                        $adresse = $row['adresse'] . ' ' . $row['code_postal'] . ' ' . $row['ville'];
                        $response = json_decode(donnees_adresse($adresse));
                        $row['x'] =  $response->features[0]->geometry->coordinates[0];
                        $row['y'] = $response->features[0]->geometry->coordinates[1];
                        $sql= 'UPDATE ' . $tablename . ' SET longitude = ' . $row['x'] . ', latitude = ' . $row['y'] . ' WHERE id = ' . $row['id'];
                        $conn->query($sql);
                    }

                    if ($properties['code_postal'] == null){
                        $properties['code_postal'] = " ";
                    }

                    if ($properties['ville'] == null){
                        $properties['ville'] = " ";
                    }

                    if ($properties['site_web'] == null){
                        $properties['site_web'] = " ";
                    }

                    if($row['x']!=null AND  $row['x']!='' AND $row['y']!=null AND  $row['y']!='') {           
                        $feature = array(
                            'type' => 'Feature',
                            'geometry' => array(
                                'type' => 'Point',
                                'coordinates' => array(
                                    $row['x'],
                                    $row['y']
                                )
                            ),
                            'properties' => $properties
                        );

                        # Add feature arrays to feature collection array
                        array_push($geojson['features'], $feature);
                    }
                }
            }
            echo 'sortie de boucle';
        
            # Convert in utf8 to avoid any error during the json_encode
            $geojson = utf8_converter($geojson);
            header('Content-type: application/json');

            # Create the GeoJSON file
            if ($comptoir[$j]=="oui") {
                $nomFichier = get_stylesheet_directory() . '/geojson/' . $scat[$i] . '-comptoir.geojson';
            } else {
                $nomFichier = get_stylesheet_directory() . '/geojson/' . $scat[$i] . '.geojson';
            }

            $search = array(" - "," ", "é", "É", "...", "'", "è", "à", ",");
            $replace = array("_","_", "e", "e", "", "", "e", "a", "");
            $nomFichier = strtolower(str_replace($search,$replace,$nomFichier));
            $fichier = fopen($nomFichier, 'w');
            fwrite($fichier, json_encode($geojson, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK));
            fclose($fichier);

        }
    }
    $conn = NULL;

}
?>
