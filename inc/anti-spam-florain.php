<?php 

function anti_spam_florain( $spam ) {
	if ( $spam ) {
	  return $spam;
	}

    // Get values from the form
    $name=trim($_POST['your-lastname']);
    $prenom=trim($_POST['your-firstname']);
    $phone=$_POST['your-tel'];
    $email=$_POST['your-email'];
    $calcul=$_POST['your-calcul'];
    $monmessage= trim($_POST['your-message']);

    if( substr_count( $name, $prenom ) != 0 || substr_count( $prenom, $name ) ) {
        $spam = true;
      } else if( strlen( $monmessage ) == 0 )
      {
        $spam = true;
      } else if( substr_count( $monmessage, "http") != 0 ) {
        $spam = true;
      } else if( $calcul != "2" && $calcul != "deux") {
        $spam = true;
      }
   
   
	return $spam;
  
}



function spam_error_message( $message, $status ) { 
        $submission = WPCF7_Submission::get_instance();
		  
		if ( $submission->is( 'spam' ) ) {

			
			$message = __( "Votre message a été considéré comme du spam pour l'une des raisons suivantes : prénom et nom identiques, message vide, présence d'un lien dans le message, mauvaise réponse au calcul.", '');
		   
		}
return $message;
}

?>