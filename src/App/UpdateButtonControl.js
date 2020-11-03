import refresh_icon from '../Assets/Icons/refresh.png';

export class UpdateButtonControl {
    onAdd( map ) {
        this._map = map;

        //Création de l'icone de refresh
        let icon = document.createElement( 'img' );
        icon.src = refresh_icon;
        icon.id = 'refreshIcon';

        //Création de la div de controle
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl';
        this._container.append( icon );

        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    onControlClick( evt ) {
        //TODO refraichir les markers
        console.log( "refresh" );
        console.log( this );
    }
}