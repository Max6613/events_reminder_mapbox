/* --------
  IMPORTS
-------- */
import mapboxgl from 'mapbox-gl';

import config from '../../app.config.json';
import '../Styles/style.scss';

import { UpdateButtonControl } from './UpdateButtonControl';
import { FiltersControl } from "./FiltersControl";


class App {
    map;
    markers = [];

    constructor() {
        mapboxgl.accessToken = config.apis.mapbox_gl.api_key;
    }

    start() {
        console.log('Application démarrée');

        //Définition du centre de la carte à afficher
        const mapCenter = new mapboxgl.LngLat(1.751749, 47.038165);

        //Instanciation de la carte
        this.map = new mapboxgl.Map({
            container: 'map',
            style: config.apis.mapbox_gl.map_style,
            center: mapCenter,
            zoom: 5.6
        });

        /* --------------------
        Controles personnalisés
        -------------------- */
        //Bouton d'actualisation
        const updateBtn = new UpdateButtonControl();
        this.map.addControl(updateBtn, 'top-left');

        //Catégories
        const filters = new FiltersControl();
        this.map.addControl(filters, 'top-right');


        /* -------
        FORMULAIRE
        ------- */
        const form_btn = document.querySelector('#formEvent > button');
        form_btn.addEventListener('click', this.formHandler.bind( this ) );
    }


    formHandler( event ) {


        const form = document.querySelector( '#formEvent' );

        /* ------------------
        Données du formulaire
        ------------------ */ //TODO validation des entrées utilisateurs
        const title = form['event_title'].value;
        const desc = form['event_desc'].value;
        const date_start = new Date( form['event_start'].value );
        const date_end = new Date();

        //Si la case "Journée entière" est coché, evenement de 8h00 à 18h00
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

        const lat = form['event_lat'].value;
        const lng = form['event_lng'].value;


        //Définition de la couleur et du message d'alerte
        // en fonction du nombre de jours restant avant l'événement
        let color = '#12BC25';
        let alert_msg = '';

        const days_left = this.numberDaysLeft( date_start );
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
        /*
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
//TODO continuer la creation de la popup en suivant le modele HTML
        //Création d'une popup (pour le click)
        const popup_click = new mapboxgl.Popup();

        // Contenu de la popup
        //  alerte
        const popup_alert = document.createElement( 'div' );
        popup_alert.classList.add( 'popup_alert' );
        popup_alert.textContent = alert_msg;

        //  titre
        const popup_title = document.createElement( 'h4' );
        popup_title.textContent = title.trim();

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
        popup_desc.textContent = desc.trim();

        //  date de début
        const popup_start = document.createElement( 'span');
        popup_start.textContent = 'Du ' + this.dateForDisplay( date_start );

        //  date de fin
        const popup_end = document.createElement( 'span');
        popup_end.textContent = ' au ' + this.dateForDisplay( date_end );

        //  dates div
        const popup_dates = document.createElement( 'div' );
        popup_dates.classList.add( 'popup_dates' );
        popup_dates.append( popup_start, popup_end );

        //  latitude
        const popup_lat = document.createElement( 'span');
        popup_lat.textContent = 'Latitude: ' + lat.trim();

        //  longitude
        const popup_lng = document.createElement( 'span');
        popup_lng.textContent = 'Longitude: ' + lng.trim();

        //  position div
        const popup_pos = document.createElement( 'div' );
        popup_pos.classList.add( 'popup_position' );
        popup_pos.append( popup_lat, popup_lng );

        const popup_div_content = document.createElement( 'div' );
        popup_div_content.classList.add( 'popup_click' );
        popup_div_content.append( popup_header, popup_desc, popup_dates, popup_pos );

        popup_click.setDOMContent( popup_div_content );


        // Ajout d'un Marker
        let marker = new mapboxgl.Marker( {color: color} );

        marker
            .setLngLat({lng, lat} )
            .setPopup( popup_click )
            .addTo( this.map );

        this.markers.push( marker );
    }

    /**
     * Return a string formatted date to display from a Date object
     * @param date
     * @returns {string}
     */
    dateForDisplay( date ) {
        return date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear() + " " +
            date.getHours() + ":" + date.getMinutes();
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

}

const app = new App();
export default app;