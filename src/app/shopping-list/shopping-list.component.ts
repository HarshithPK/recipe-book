import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { Ingredient } from '../shared/ingredient.model';
import * as ShoppingListActions from './store/shopping-list.actions';
import * as fromApp from '../store/app.reducer';

@Component({
    selector: 'app-shopping-list',
    templateUrl: './shopping-list.component.html',
    styleUrls: ['./shopping-list.component.css'],
})
export class ShoppingListComponent implements OnInit, OnDestroy {
    ingredients: Observable<{ ingredients: Ingredient[] }>;
    // private subscription: Subscription;

    constructor(private store: Store<fromApp.AppState>) {}

    ngOnInit() {
        this.ingredients = this.store.select('shoppingList');
        // this.ingredients = this.slService.getIngredients();

        // // tslint:disable-next-line: deprecation
        // this.subscription = this.slService.ingredientsChanged.subscribe(
        //     (ingredients: Ingredient[]) => {
        //         this.ingredients = ingredients;
        //     }
        // );
    }

    onEditItem(index: number) {
        // this.slService.startedEditing.next(index);
        this.store.dispatch(new ShoppingListActions.StartEdit(index));
    }

    ngOnDestroy() {
        // this.subscription.unsubscribe();
    }
}
