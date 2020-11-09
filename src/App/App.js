/* --------
  IMPORTS
-------- */
import mapboxgl from 'mapbox-gl';
import flatpickr from 'flatpickr';
import { French } from 'flatpickr/dist/l10n/fr.js'


import config from '../../app.config.json';
import '../Styles/style.scss';

import { UpdateButtonControl } from './UpdateButtonControl';
import { FiltersControl } from "./FiltersControl";
import { EventReminder } from "./Models/EventReminder";

const TITLE_LEN = '25';
const DESC_LEN = '250';
const DATE_REGEX = new RegExp( /^\d{4,6}-\d{1,2}-\d{1,2}T\d{2}:\d{2}$/ );


class App {
    /**
     * Localstorage name
     * @returns {string}
     */
    get storageName() { return 'eventsReminder'}

    /**
     * Mapbox map
     */
    map;

    /**
     * Array containing events to create markers
     * @type {[]}
     */
    events = [];


    /**
     * Class App constructor
     */
    constructor() {
        mapboxgl.accessToken = config.apis.mapbox_gl.api_key;
    }


    /**
     * Launch the application
     */
    start() {
        //Instanciation de la carte
        this.map = new mapboxgl.Map({
            container: 'map',
            style: config.apis.mapbox_gl.map_style,
            center: [1.751749, 47.038165],
            zoom: 5.6
        });

        //Récupération des données du localstorage
        const str_data = localStorage.getItem( this.storageName );

        //Si des données existe en localstorage
        if ( str_data ) {
            //Création d'un JSON à partir des données récupérés
            const json_data = JSON.parse( str_data );

            //Remplissage du tableau de Markers à partir du JSON
            for ( let key in json_data ){
                this.events.push( EventReminder.fromJson( json_data[ key ] ) );
            }
        }

        //Ajout des markers récupéré depuis le localstorage à la carte
        this.updateMap();

        /* ------------------
        ----- Controles -----
        --- personnalisés ---
        ------------------ */
        //Bouton d'actualisation
        const update_btn = new UpdateButtonControl();
        this.map.addControl(update_btn, 'top-left');

        //Filtres
        const filters = new FiltersControl();
        this.map.addControl(filters, 'top-right');

        /* ---------------------
        --- Rafraichissement ---
        --------------------- */
        const refresh = document.querySelector( '#refreshMarkers' );
        refresh.addEventListener( 'click', this.updateMap.bind( this ) );

        /* -----------
        --- Filtres ---
        ----------- */
        const cat_icons = document.querySelector( '#catIcons' );
        cat_icons.addEventListener( 'change', this.filters.bind( this ) )

        /* ---------------
        --- Formulaire ---
        --------------- */
        const form = document.querySelector('#formEvent');
        form.addEventListener('submit', this.formHandler.bind( this ) );

        /* -------------------
        ------ Checkbox ------
        --- journée entière --
        ------------------- */
        const all_day_check = document.querySelector( '#eventAllDay' );
        all_day_check.addEventListener( 'change', this.checkboxEvent.bind( this ) );

        /* ----------------
        --- Suppression ---
        ---------------- */
        const delete_all = document.querySelector( '#deleteAll' );
        delete_all.addEventListener( 'click', this.clearMarkers.bind( this ) );

        /* -----------------------
        --------- Bonus 1 --------
        --- Sélection position ---
        ------ sur la carte ------
        ----------------------- */
        const select_pos = document.querySelector( '#selectPos' );
        select_pos.addEventListener( 'click', this.selectPosOnMap.bind( this ) );

        /* --------------------
        ------- Bonus 2 -------
        --- Flatpickr dates ---
        -------------------- */
        this.dateFlatpickr( '#eventStart' );
        this.dateFlatpickr( '#eventEnd' );

        //Au changement de date de début on adapte la date de fin
        document.querySelector( '#eventStart' ).addEventListener( 'change', this.adaptDateEnd.bind( this ) );
    }


    /**
     * Display or hide markers corresponding to a filter
     * @param event
     */
    filters( event ) {
        //Récupération de la checkbox
        const target = event.target;
        const regex = [ /^green/, /^orange/, /^red/];
        let color = '';

        for ( let key in regex ) {
            let result = target.id.match( regex[ key ] );

            if ( result !== null ) {
                color = result[0];
            }
        }

        //Sélection des markers correspondant à la checkbox activé / désactivé
        const markers_selected = document.querySelectorAll( '.mapboxgl-marker.' + color );

        //Affichage ou masquage des markers en fonction de l'état de la checkbox
        Array.prototype.forEach.call( markers_selected, function ( node ) {
            if ( !target.checked ) {
                node.setAttribute( 'hidden', '' );
            }
            else {
                node.removeAttribute( 'hidden' );
            }
        });
    }


    /**
     * Get and verify form data, save to localstorge and create marker
     * @param event
     */
    formHandler( event ) {
        //Empeche le navigateur d'envoyer la requete et d'actualiser la page
        event.preventDefault();

        //Récupération du formulaire
        const form = event.target;

        /* --------------------------
        --- Données du formulaire ---
        -------------------------- */ //TODO validation des entrées utilisateurs
        //contient les noms des inputs en erreur de format
        const inp_err_names = [];

        //Vérification du format de la date
        if ( !DATE_REGEX.test( form['event_start'].value ) ){
            inp_err_names.push( 'event_start' );
            //TODO fonction affichage erreur d'entrée sur le formulaire
        }

        const date_start = new Date( form['event_start'].value );
        let date_end = new Date();

        //Si la case "Journée entière" est coché, événement de 8h00 à 18h00
        if ( form['event_all_day'].checked ){
            date_start.setHours( 8 );
            date_start.setMinutes( 0 );

            //Copie de la date de début et modification de l'heure
            date_end.setFullYear( date_start.getFullYear() );
            date_end.setMonth( date_start.getMonth() );
            date_end.setDate( date_start.getDate() );
            date_end.setHours( 18 );
            date_end.setMinutes( 0 );
        }
        //Sinon date entrée dans le formulaire
        else {
            //Vérification du format de la date
            if ( !DATE_REGEX.test( form['event_end'].value ) ){
                inp_err_names.push( 'event_end' );
                //TODO fonction affichage erreur d'entrée sur le formulaire
            }
            date_end = new Date( form['event_end'].value );
        }

        //Création d'un objet EventReminder
        const reminder_data = {
            'title':        this.stringShrinker( form[ 'event_title' ].value.trim(), TITLE_LEN),
            'description':  this.stringShrinker( form[ 'event_desc' ].value.trim(), DESC_LEN ),
            'date_start':   date_start,
            'date_end':     date_end,
            'latitude':     this.stringShrinker( form['event_lat'].value.trim(), 10, false ),
            'longitude':    this.stringShrinker( form['event_lng'].value.trim(), 10, false )
        };
        const reminder = new EventReminder( reminder_data );

        //Ajout de l'object EventReminder dans le tableau
        //Sauvegarde du tableau en localstorage
        this.events.push( reminder );
        this.saveToStorage();

        //Méthode de création d'un marker
        this.newMarker( reminder );
    }


    /**
     * Create marker from an EventReminder object
     * @param reminder
     */
    newMarker( reminder ) {
        //Définition de la couleur et du message d'alerte
        // en fonction du nombre de jours restant avant l'événement
        // défaut +3 jours => vert
        let color = '#12BC25';
        let marker_class = 'green';
        let alert_msg = '';

        const days_left = this.numberDaysLeft( reminder.date_start );

        //evenement passé => rouge
        if ( days_left < 0 ) {
            color = '#f3132c';
            marker_class = 'red';
            alert_msg = 'Quel dommage, vous avez raté cet événement!';
        }
        //3 jours ou moins => orange
        else if ( days_left <= 3 ) {
            color = '#dd9e00';
            marker_class = 'orange';
            alert_msg = 'Attention, commence ' + this.timeLeftStr( days_left ).toLowerCase();
        }

        /* --------------------
        ---- Objets Mapbox ----
        -------------------- */

        /* POPUP AU CLICK
        <div class="popup_click">
            <div class="popup_header">
                <div class="popup_alert">Message en fonction du nb de jours restant</div>
                <h4>Titre de la popup</h4>
            </div>

            <div class="popup_desc">Description</div>

            <div class="popup_dates">
                <span>Date de début</span>
                <span>Date de fin</span>
            </div>

            <div class="popup_position">
                <span>Latitude</span>
                <span>Longitude</span>
            </div>
        </div>
        */

        // Contenu de la popup
        //  header
        const popup_header = document.createElement( 'div' );
        popup_header.classList.add( 'popup_header' );

        //  alerte
        if ( alert_msg !== '' ){
            const popup_alert = document.createElement( 'div' );
            popup_alert.classList.add( 'popup_alert' );
            popup_alert.textContent = alert_msg;

            popup_header.append( popup_alert );
        }

        //  titre
        const popup_title = document.createElement( 'h4' );
        popup_title.textContent = reminder.title;

        popup_header.append( popup_title );

        //  description
        const popup_desc = document.createElement( 'div' );
        popup_desc.classList.add( 'popup_desc' );
        popup_desc.textContent = reminder.description;

        //  date de début
        const popup_start = document.createElement( 'span');
        const date_start_str = this.dateForDisplay( reminder.date_start );
        popup_start.textContent = 'Du ' + date_start_str;

        //  date de fin
        const popup_end = document.createElement( 'span');
        const date_end_str = this.dateForDisplay( reminder.date_end );
        popup_end.textContent = ' au ' + date_end_str;

        //  dates div
        const popup_dates = document.createElement( 'div' );
        popup_dates.classList.add( 'popup_dates' );
        popup_dates.append( popup_start, popup_end );

        //  latitude
        const popup_lat = document.createElement( 'span');
        popup_lat.textContent = 'Latitude: ' + reminder.latitude;

        //  longitude
        const popup_lng = document.createElement( 'span');
        popup_lng.textContent = 'Longitude: ' + reminder.longitude;

        //  position div
        const popup_pos = document.createElement( 'div' );
        popup_pos.classList.add( 'popup_position' );
        popup_pos.append( popup_lat, popup_lng );

        const popup_div_content = document.createElement( 'div' );
        popup_div_content.classList.add( 'popup_click' );
        popup_div_content.append( popup_header, popup_desc, popup_dates, popup_pos );

        //Création de la popup (pour le click)
        const popup_click = new mapboxgl.Popup({
            closeOnMove: true,
            maxWidth: '300px'
        });
        popup_click.setDOMContent( popup_div_content );

        /* POPUP AU HOVER
        <div class="popup_hover">
           <div class="popup_header">
               <div class="popup_title">
                   <h4>Titre de la popup</h4>
                   <em>Dans X jours/heures/minutes</em>
               </div>
           </div>

           <div class="popup_dates">
               <span>Date de début</span>
               <span>Date de fin</span>
           </div>
        </div>
        */
        // message en fonction du temps restant
        //    time_left = [days, hours, minutes]
        const time_left = this.timeLeftArray( days_left );
        const time_left_str = this.timeLeftStr( time_left[ 0 ] );

        // temps restant
        const popup_time_left = document.createElement( 'em' );
        popup_time_left.textContent = time_left_str;

        const popup_title_clone = popup_title.cloneNode( true );

        // titre div (titre + temps restant)
        const popup_title_div = document.createElement( 'div' );
        popup_title_div.classList.add( 'popup_title' );
        popup_title_div.append( popup_title_clone, popup_time_left );

        const popup_hover = document.createElement( 'div' );
        popup_hover.classList.add( 'popup_hover' );
        popup_hover.append( popup_title_div, popup_dates )

        // Ajout d'un Marker
        let marker = new mapboxgl.Marker( {color: color, title: reminder.title} );

        marker
            .setLngLat([ reminder.longitude, reminder.latitude ] )
            .setPopup( popup_click )
            .addTo( this.map );

        //Récupération de l'élément HTML correspondant au marker
        const html_marker = marker.getElement();
        html_marker.title = popup_title.textContent; //TODO delete ??
        html_marker.classList.add( marker_class );
        html_marker.append( popup_hover );
    }


    /**
     * Returns the time remaining before the event in string
     * @param days_left
     * @returns {string}
     */
    timeLeftStr( days_left ) {
        // [days, hours, minutes]
        const time_arr = this.timeLeftArray( days_left );
        const days = time_arr[ 0 ];
        const hours = time_arr[ 1 ];
        const minutes = time_arr[ 2 ];

        let str = 'Dans ';

        if ( days > 3 ) { // + 3 jours: "Dans x jours"
            str += days + ' jours';
        }
        else if ( days > 0 ) { // 1/3 jours: "Dans X jours et Y heures"
            str += days + ' jours et ' + hours + ' heures';
        }
        else if ( days === 0 ) {
            if ( hours > 0 ){ // - 1 jours/ + 1 heure: "Dans X heures et Y minutes"
                str += hours + ' heures et ' + minutes + ' minutes';
            }
            else { // - 1 jours/ - 1 heure: "Dans X minutes"
                str += minutes + ' minutes';
            }
        }
        else {
            str = 'Evénement passé';
        }

        return str;
    }


    /**
     * Returns an array containing the days, hours and minutes left before the event
     * @param days_left
     * @returns {number[]}
     */
    timeLeftArray( days_left ) {
        const days = Math.floor( days_left ) ;
        const hours_left = days_left % 1 * 24;

        const hours = Math.floor( hours_left );
        const mins_left = hours_left % 1 * 60;

        const minutes = Math.floor( mins_left );

        return [ days, hours, minutes ];
    }


    /**
     * Returns a string formatted date to display from a Date object
     * @param date
     * @returns {string}
     */
    dateForDisplay( date ) {
        return this.numberForDisplay( date.getDate(), 2 ) +
            "-" + this.numberForDisplay( date.getMonth() + 1, 2 ) +
            "-" + this.numberForDisplay( date.getFullYear(), 4 ) +
            " " + this.numberForDisplay( date.getHours(), 2 ) +
            ":" + this.numberForDisplay( date.getMinutes(), 2 );
    }


    /**
     * Returns a string formatted number, with 'size' digits
     * @param nb
     * @param size
     * @returns {string}
     */

    numberForDisplay( nb, size ){
        nb = nb.toString();
        while ( nb.length < size ) nb = '0' + nb;
        return nb;
    }

    /**
     * Returns the number of days (float) between now and a Date object
     * @param dateStart
     * @returns {number}
     */
    numberDaysLeft( dateStart ) {
        const now = new Date();

        if ( now > dateStart ){
            return -1;
        }

        const diff = dateStart - now;
        // Calcul pour convertir le timestamp correspondant à la difference entre les jours
        //      ms ->  s -> min -> h -> j
        return diff / 1000 / 60 / 60 / 24;
        // return Math.floor( diff / 1000 / 60 / 60 / 24 );
    }


    /**
     * Returns a string shortenend to the length entered
     * @param str
     * @param len
     * @param ellipsis
     * @returns {string|*}
     */
    stringShrinker( str, len, ellipsis = true ) {
        return str.length > len ? str.substring( 0, len - 3 ) + ( ellipsis ? '...' : '' ) : str;
    }


    /**
     * Saves the events array in localstorage
     */
    saveToStorage() {
        localStorage.setItem( this.storageName, JSON.stringify( this.events ) )
    }


    /**
     * Deletes all Markers from map and storage
     */
    clearMarkers() {
        //Sélection des markers correspondant à la checkbox activé / désactivé
        const markers = document.querySelectorAll( '.mapboxgl-marker' );

        //Affichage ou masquage des markers en fonction de l'état de la checkbox
        Array.prototype.forEach.call( markers, function ( marker ) {
            marker.remove();
        });

        this.events = [];
        this.saveToStorage();
    }


    /**
     * Display markers on the map
     */
    updateMap() {
        for ( let key in this.events ) {
            this.newMarker( this.events[ key ] );
        }
    }


    /**
     * Enter in mode selection, cursor change, click on map will set Lat/Long inputs values
     * @param event
     */
    selectPosOnMap( event ) {
        const target = event.target;

        //Passage en mode d'entrée de la position par l'utilisateur
        if ( target.classList.contains( 'cancel' ) ) {
            //Réactivation des champs input
            const pos_inputs = [ document.querySelector( '#eventLat' ), document.querySelector( '#eventLng' ) ]

            for (let i in pos_inputs ) {
                pos_inputs[ i ].removeAttribute( 'disabled' );
            }

            //Curseur sur la carte par défaut
            document.querySelector( '#map' ).classList.remove( 'selectMode' );

            //Suppression du message dans le formulaire + changement du texte du bouton
            document.querySelector( '#selectModeMess' ).remove();
            target.classList.remove( 'cancel' );
            target.textContent = 'Choisir sur la carte';

        }
        //Passage en mode de sélection de la position sur la carte
        else {
            //Désactivation des champs input
            const pos_inputs = [ document.querySelector( '#eventLat' ), document.querySelector( '#eventLng' ) ]

            for (let i in pos_inputs ) {
                pos_inputs[ i ].disabled = true;
            }

            //Curseur sur la carte 'crosshair'
            document.querySelector( '#map' ).classList.add( 'selectMode' );

            //Ajout d'un message dans le formulaire + changement du texte du bouton
            const mess = document.createElement( 'span' );
            mess.textContent = 'Cliquez sur la carte à l\'emplacement souhaité';
            mess.id = 'selectModeMess';
            target.before( mess );
            target.classList.add( 'cancel' );
            target.textContent = 'Annuler';

            //Ajout des coordonnées du clic aux inputs
            this.map.once( 'click', function (event) {
                console.log("cliiiick");
                const pos = event.lngLat;

                document.querySelector( '#eventLng' ).value = pos.lng.toFixed( 7 );
                document.querySelector( '#eventLat' ).value = pos.lat.toFixed( 7 );

                //On déclenche un evenement click sur le meme bouton pour revenir à l'état d'origine
                target.click();
            } );
        }
    }


    getPosOnClick( event ) {
        console.log("cliiiick");
        const pos = event.lngLat;

        document.querySelector( '#eventLng' ).value = pos.lng.toFixed( 7 );
        document.querySelector( '#eventLat' ).value = pos.lat.toFixed( 7 );

        //On déclenche un evenement click sur le meme bouton pour revenir à l'état d'origine
        target.click();
        event.stopPropagation();
    }



    /**
     * Delete inputs date end if checkbox checked, add it back if unchecked
     * @param event
     */
    checkboxEvent( event ) {
        const target = event.target;

        if (target.checked) {
            document.querySelector( '#dateEnd' ).remove();
        }
        else {
            //Création de l'input date
            const inp_end = document.createElement( 'input' );
            inp_end.type = 'datetime-local';
            inp_end.name = 'event_end';
            inp_end.id = 'eventEnd';
            inp_end.required = true;

            //Création du label
            const label_end = document.createElement( 'label' );
            label_end.for = 'eventEnd';
            label_end.textContent = 'Date de fin';

            //Création de la div (input + label)
            const div_end = document.createElement( 'div' );
            div_end.classList.add( 'input' );
            div_end.id = 'dateEnd';
            div_end.append( label_end, inp_end );

            //Ajout de la div
            document.querySelector( '#datesForm' ).append( div_end );

            //Utilisation de flatpickr sur le champ
            this.dateFlatpickr( '#eventEnd' );
        }
    }


    /**
     * Use flatpickr lib for the inputs date
     * @param selector
     * @param minDate
     * @param defaultDate
     */
    dateFlatpickr( selector, minDate = 'today', defaultDate = '' ) {
        let date_conf = {
            locale: French,
            enableTime: true,
            time_24hr: true,
            altInput: true,
            dateFormat: "Y-m-d H:i",
            altFormat: "l j F Y H:i",
            minDate: minDate,
            defaultDate: defaultDate
        };

        flatpickr( selector, date_conf );
    }


    /**
     * Change the value of date end input according to date start input value
     * @param event
     */
    adaptDateEnd( event ) {
        //String date de début
        const date_start = event.target.value;

        //Date de début + 30min pour date de fin par défaut
        const date_end_def = new Date( date_start );
        date_end_def.setTime( date_end_def.getTime() + ( 30 * 60 * 1000 ) )

        this.dateFlatpickr( '#eventEnd', date_start, date_end_def.getTime() )
    }
}

const app = new App();
export default app;