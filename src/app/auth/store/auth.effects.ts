import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import { User } from '../user.model';

import * as AuthActions from './auth.actions';

export interface AuthResponseData {
    kind: string;
    idToken: string;
    email: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
    registered?: boolean;
}

const handleAuthentication = (
    email: string,
    userId: string,
    token: string,
    expiresIn: number
) => {
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);
    const user = new User(email, userId, token, expirationDate);
    localStorage.setItem('userData', JSON.stringify(user));

    return new AuthActions.AuthenticateSuccess({
        email: email,
        userId: userId,
        token: token,
        expirationDate: expirationDate,
    });
};

const handleError = (errorRes: any) => {
    let errorMessage = 'An unknown error occurred!';
    if (!errorRes.error || !errorRes.error.error) {
        return of(new AuthActions.AuthenticateFail(errorMessage));
    }
    switch (errorRes.error.error.message) {
        case 'EMAIL_EXISTS':
            errorMessage = 'This email already exists.';
            break;
        case 'EMAIL_NOT_FOUND':
            errorMessage = 'This email does not exist.';
            break;
        case 'INVALID_PASSWORD':
            errorMessage = 'The entered password is incorrect.';
            break;
    }
    return of(new AuthActions.AuthenticateFail(errorMessage));
};

@Injectable()
export class AuthEffects {
    // tslint:disable-next-line: deprecation
    @Effect()
    authSignup = this.actions$.pipe(
        ofType(AuthActions.SIGNUP_START),
        switchMap((signupAction: AuthActions.SignupStart) => {
            const url =
                'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' +
                environment.firebaseAPIKey;

            return this.http
                .post<AuthResponseData>(url, {
                    email: signupAction.payload.email,
                    password: signupAction.payload.password,
                    returnSecureToken: true,
                })
                .pipe(
                    tap((resData) => {
                        this.authService.setLogoutTimer(
                            +resData.expiresIn * 1000
                        );
                    }),
                    map((resData) => {
                        return handleAuthentication(
                            resData.email,
                            resData.localId,
                            resData.idToken,
                            +resData.expiresIn
                        );
                    }),
                    catchError((errorRes) => {
                        return handleError(errorRes);
                    })
                );
        })
    );

    // tslint:disable-next-line: deprecation
    @Effect()
    authLogin = this.actions$.pipe(
        ofType(AuthActions.LOGIN_START),
        switchMap((authData: AuthActions.LoginStart) => {
            const url =
                'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' +
                environment.firebaseAPIKey;

            return this.http
                .post<AuthResponseData>(url, {
                    email: authData.payload.email,
                    password: authData.payload.password,
                    returnSecureToken: true,
                })
                .pipe(
                    tap((resData) => {
                        this.authService.setLogoutTimer(
                            +resData.expiresIn * 1000
                        );
                    }),
                    map((resData) => {
                        return handleAuthentication(
                            resData.email,
                            resData.localId,
                            resData.idToken,
                            +resData.expiresIn
                        );
                    }),
                    catchError((errorRes) => {
                        return handleError(errorRes);
                    })
                );
        })
    );

    // tslint:disable-next-line: deprecation
    @Effect({ dispatch: false })
    authRedirect = this.actions$.pipe(
        ofType(AuthActions.AUTHENTICATE_SUCCESS),
        tap(() => {
            this.router.navigate(['/']);
        })
    );

    // tslint:disable-next-line: deprecation
    @Effect()
    autoLogin = this.actions$.pipe(
        ofType(AuthActions.AUTO_LOGIN),
        map(() => {
            const userData: {
                email: string;
                id: string;
                _token: string;
                _tokenExpirationDate: string;
            } = JSON.parse(localStorage.getItem('userData'));
            if (!userData) {
                return { type: 'DUMMY' };
            }

            const loadedUser = new User(
                userData.email,
                userData.id,
                userData._token,
                new Date(userData._tokenExpirationDate)
            );

            if (loadedUser.token) {
                // this.user.next(loadedUser);
                const expirationDuration =
                    new Date(userData._tokenExpirationDate).getTime() -
                    new Date().getTime();

                this.authService.setLogoutTimer(expirationDuration);

                return new AuthActions.AuthenticateSuccess({
                    email: loadedUser.email,
                    userId: loadedUser.id,
                    token: loadedUser.token,
                    expirationDate: new Date(userData._tokenExpirationDate),
                });

                // this.autoLogout(expirationDuration);
            }
            return { type: 'DUMMY' };
        })
    );

    // tslint:disable-next-line: deprecation
    @Effect({ dispatch: false })
    authLogout = this.actions$.pipe(
        ofType(AuthActions.LOGOUT),
        tap(() => {
            this.authService.clearLogoutTimer();
            localStorage.removeItem('userData');
            this.router.navigate(['/auth']);
        })
    );

    constructor(
        private actions$: Actions,
        private http: HttpClient,
        private router: Router,
        private authService: AuthService
    ) {}
}
