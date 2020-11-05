/* --------
  IMPORTS
-------- */
import mapboxgl from 'mapbox-gl';

import config from '../../app.config.json';
import '../Styles/style.scss';

import { UpdateButtonControl } from './UpdateButtonControl';
import { FiltersControl } from "./FiltersControl";
import { EventReminder } from "./Models/EventReminder";


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

        //TODO Récupération des données du localstorage
        const str_data = localStorage.getItem( this.storageName );

        //Si des données existe en localstorage
        if ( str_data ) {
            //Création d'un JSON à partir des données récupérés
            const json_data = JSON.parse( str_data );
            console.dir(json_data);
            //Remplissage du tableau de Markers à partir du JSON
            for ( let item in json_data ){
                this.events.push( new EventReminder( item ) );
            }
            console.dir(this.events);
        }

        /* --------------------
        Controles personnalisés
        -------------------- */
        //Bouton d'actualisation
        const updateBtn = new UpdateButtonControl();
        this.map.addControl(updateBtn, 'top-left');

        //Catégories
        const filters = new FiltersControl();
        this.map.addControl(filters, 'top-right');

        /* -----------
        --- Layers ---
        ----------- */
        //TODO filtres https://docs.mapbox.com/mapbox-gl-js/example/filter-markers/




        /* ---------
        --- Form ---
        --------- */
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
     *
     * @param event
     */
    formHandler( event ) {
        //Empeche le navigateur d'envoyer la requete et d'actualiser la page
        event.preventDefault();

        const form = event.target;
        console.dir(form);

        // //Ajout de l'événement dans le tableau
        // this.events.push( event );
        // this.saveToStorage();

        //Ajout du formulaire dans le tableau
        //Sauvegarde du tableau en localstorage
        this.events.push( form );
        this.saveToStorage();

        /* ------------------
        Données du formulaire
        ------------------ */ //TODO validation des entrées utilisateurs
        const date_start = new Date( form['event_start'].value );
        const date_end = new Date();

        //Si la case "Journée entière" est coché, événement de 8h00 à 18h00
        if ( form['event_all_day'].checked ){
            date_start.setHours( 8 );
            date_start.setMinutes( 0 );

            date_end.setDate( date_start.getDate() )
            date_end.setHours( 18 );
            date_end.setMinutes( 0 );
        }
        else { //TODO trouver un autre moyen de récupérer la date de fin, mettre date_end en let ???
            const tmp_end = form['event_end'].value.split( 'T' );
            const dates = tmp_end[ 0 ].split( '-' );
            const time = tmp_end[ 1 ].split( ':' );

            date_end.setFullYear( dates[ 0 ] );
            date_end.setMonth( dates[ 1 ] - 1  );
            date_end.setDate( dates[ 2 ] );

            date_end.setHours( time[ 0 ] );
            date_end.setMinutes( time[ 1 ] );
        }

        //Création d'un objet EventReminder
        const reminder_data = {
            'title': form['event_title'].value.trim(),
            'description': form['event_desc'].value.trim(),
            'date_start': date_start,
            'date_end': date_end,
            'latitude': form['event_lat'].value.trim(),
            'longitude': form['event_lng'].value.trim()
        };
        const reminder = new EventReminder( reminder_data );


        //Définition de la couleur et du message d'alerte
        // en fonction du nombre de jours restant avant l'événement
        // défaut vert
        let color = '#12BC25';
        let alert_msg = '';

        const days_left = this.numberDaysLeft( reminder.date_start );
        //On récupère la partie décimal du nb de jours restants
        // puis on multiplie par 24 pour convertir en heure
        const hours_left = (days_left % 1) * 24;
        const min_left = (hours_left % 1) * 60;

        if ( days_left < 0 ) {
            color = '#f3132c';
            alert_msg = 'Quel dommage, vous avez raté cet événement!';
        }
        else if ( days_left <= 3 ) {
            color = '#dd9e00';
            alert_msg = 'Attention, commence dans ';
            if ( Math.floor(days_left) > 0 ){
                alert_msg += `${ Math.floor( days_left ) } jours et`
            }
            alert_msg += `${ Math.floor( hours_left ) } heures.`;
        }

        /* ----------
        Objets Mapbox
         ----------*/

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

        //  message en fonction du temps restant
        let time_left = 'Dans ';
        if ( Math.floor(days_left) > 3 ) { // + 3 jours: "Dans x jours"
            time_left += Math.floor(days_left) + ' jours';
        }
        else if ( Math.floor(days_left) > 0 ) { // 1/3 jours: "Dans X jours et Y heures"
            time_left += Math.floor(days_left) + ' jours et ' + Math.floor(hours_left) + ' heures';
        }
        else if ( Math.floor(days_left) === 0 ) {
            if ( Math.floor(hours_left) > 0 ){ // - 1 jours/ + 1 heure: "Dans X heures et Y minutes"
                time_left += Math.floor(hours_left) + ' heures et ' + Math.floor(min_left) + ' minutes';
            }
            else { // - 1 jours/ - 1 heure: "Dans X minutes"
                time_left += Math.floor(min_left) + ' minutes';
            }
        }
        else {
            time_left = 'Evénement passé';
        }

        //  temps restant
        const popup_time_left = document.createElement( 'em' );
        popup_time_left.textContent = time_left;

        //  titre div
        const popup_title_div = document.createElement( 'div' );
        popup_title_div.classList.add( 'popup_title' );
        popup_title_div.append( popup_title, popup_time_left );

        //  header
        const popup_header = document.createElement( 'div' );
        popup_header.classList.add( 'popup_header' );
        popup_header.append( popup_alert, popup_title_div );

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
        html_marker.append( popup_hover );


    }

    /**
     * Return a string formatted date to display from a Date object
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
     * Return a string formatted number, with 'size' digits
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
     * Return the number of days (float) between now and a Date object
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

    saveToStorage() {
        localStorage.setItem( this.storageName, JSON.stringify( this.events ) )
    }

}

const app = new App();
export default app;