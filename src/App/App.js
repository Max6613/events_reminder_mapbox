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

        /* ----------
        Objets Mapbox
         ----------*/
        //Création d'une popup (pour le click)
        const popup_click = new mapboxgl.Popup();
        // Contenu de la popup
        const popup_title = document.createElement( 'span' );
        popup_title.textContent = title.trim();

        const popup_desc = document.createElement( 'span' );
        popup_desc.textContent = desc.trim();

        const popup_start = document.createElement( 'span');
        popup_start.textContent = this.dateForDisplay( date_start );

        const popup_end = document.createElement( 'span');
        popup_end.textContent = this.dateForDisplay( date_end );

        const popup_lat = document.createElement( 'span');
        popup_lat.textContent = lat.trim();

        const popup_lng = document.createElement( 'span');
        popup_lng.textContent = lng.trim();

        const popup_div_content = document.createElement( 'div' );
        popup_div_content.classList.add( 'popup_click' );
        popup_div_content.append( popup_title, popup_desc, popup_start, popup_end, popup_lat, popup_lng );

        popup_click.setDOMContent( popup_div_content );

        // Ajout d'un Marker
        let marker = new mapboxgl.Marker();
        marker
            .setLngLat({lng, lat} )
            .setPopup( popup_click )
            .addTo( this.map );

        this.markers.push( marker );
    }
    
    dateForDisplay( date ) {
        return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + date.getMinutes();
    }
}

const app = new App();
export default app;