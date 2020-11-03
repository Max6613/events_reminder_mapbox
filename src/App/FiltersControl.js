import green_icon from '../Assets/Icons/green.png';
import orange_icon from '../Assets/Icons/orange.png';
import red_icon from '../Assets/Icons/red.png';


export class FiltersControl {
    onAdd( map ) {
        this._map = map;

        //Création des icones de catégories
        let green = document.createElement( 'img' );
        green.src = green_icon;
        green.classList.add( 'categories_icons' );
        
        let orange = document.createElement( 'img' );
        orange.src = orange_icon;
        orange.classList.add( 'categories_icons' );
        
        let red = document.createElement( 'img' );
        red.src = red_icon;
        red.classList.add( 'categories_icons' );
        

        //Création de la div de controle
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl';
        this._container.append( green );
        this._container.append( orange );
        this._container.append( red );

        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    onControlClick( evt ) {
        //TODO refraichir les markers
        console.log( "categories" );
        console.log( this );
    }
}