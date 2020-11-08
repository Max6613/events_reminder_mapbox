/* --------
  IMPORTS
-------- */
import mapboxgl from 'mapbox-gl';

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
        // this.clearMarkers();
        //Instanciation de la carte
        this.map = new mapboxgl.Map({
            container: 'map',
            style: config.apis.mapbox_gl.map_style,
            center: [1.751749, 47.038165],
            zoom: 5.6
        });


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
        const updateBtn = new UpdateButtonControl();
        this.map.addControl(updateBtn, 'top-left');

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
        const allDayCheck = document.querySelector( '#eventAllDay' );
        allDayCheck.addEventListener( 'change', function ( event ) {


            if (this.checked) {
                const div_end = document.querySelector( '#eventEnd' ).parentNode;
                form.removeChild( div_end );
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

                form.insertBefore( div_end,  document.querySelector( '#latitude' ) );
            }
        });



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
        // console.dir(markers_selected);

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
                <div class="popup_title">
                    <h4>Titre de la popup</h4>
                    <em>Dans X jours/heures/minutes</em>
                </div>
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

        //Création de la popup (pour le click)
        const popup_click = new mapboxgl.Popup({
            closeOnMove: true,
            maxWidth: '300px'
        });

        // Contenu de la popup
        //  alerte
        const popup_alert = document.createElement( 'div' );
        popup_alert.classList.add( 'popup_alert' );
        popup_alert.textContent = alert_msg;

        //  titre
        const popup_title = document.createElement( 'h4' );
        popup_title.textContent = reminder.title;

        //  header
        const popup_header = document.createElement( 'div' );
        popup_header.classList.add( 'popup_header' );
        popup_header.append( popup_alert, popup_title );

        // console.dir(popup_title);
        // console.dir(popup_time_left);
        // console.dir(popup_title_div);
        // console.dir(popup_alert);
        // console.dir(popup_header);

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
        this.timeLeftArray(2.9532);

        const time_left = this.timeLeftStr( days_left );

        // temps restant
        const popup_time_left = document.createElement( 'em' );
        popup_time_left.textContent = time_left;

        // titre div (titre + temps restant)
        const popup_title_div = document.createElement( 'div' );
        popup_title_div.classList.add( 'popup_title' );
        popup_title_div.append( popup_title, popup_time_left );

        const popup_hover = document.createElement( 'div' );
        popup_hover.classList.add( 'popup_hover' );
        popup_hover.append( popup_title_div, popup_dates )

        // Ajout d'un Marker
        let marker = new mapboxgl.Marker( {color: color, title: popup_title} );

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
    clearMarkers() { //TODO delete from map
        this.events = "";
        this.saveToStorage();
    }

    /**
     * Display markers on the map
     */
    updateMap() {
        console.log('update');
        for ( let key in this.events ) {
            this.newMarker( this.events[ key ] );
        }
    }
}

const app = new App();
export default app;