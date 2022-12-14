import {ChangeDetectorRef, Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
    BehaviorSubject,
    filter,
    map,
    Observable,
    of,
    ReplaySubject,
    Subject,
    switchMap,
    take, takeUntil,
    tap,
    throwError
} from 'rxjs';
import { environment } from "../../../environments/environment";

import {cloneDeep} from "lodash-es";
import {Quizz} from "./quizz.models";
import {UserService} from "../user/user.service";
import {User} from "../user/user.model";

@Injectable({
    providedIn: 'root'
})
export class QuizzService
{
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private _quizzs: BehaviorSubject<Quizz[] | null> = new BehaviorSubject(null);
    user: User;

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient,
                private _userService: UserService)
    {
        // Subscribe to user changes
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user;

            });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for quizzs
     */
    get quizzs$(): Observable<Quizz[]>
    {
        return this._quizzs.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get all quizzs
     */
    getAll(): Observable<Quizz[]>
    {
        return this._httpClient.get<any>(environment.backendUrl + 'quizzs/').pipe(
            tap((quizzs) => {
                if(quizzs) {
                    this._quizzs.next(quizzs);
                }
            })
        );
    }

    /**
     * Get all quizzs realised
     */
    getAllRealised(): Observable<Quizz[]>
    {
        return this._httpClient.get<any>(environment.backendUrl + 'Defis/Utilisateur/'  + this.user.id + '/DateCreation/desc').pipe(
            tap((quizzs) => {
                if(quizzs) {
                    quizzs = quizzs.filter(quizz => quizz.realise && quizz.realise === true);
                    this._quizzs.next(quizzs);

                    return quizzs;
                }
            })
        );
    }

    /**
     * Get all quizzs order by like
     */
    getAllByLike(sort = 'desc'): Observable<Quizz[]>
    {
        return this._httpClient.get<any>(environment.backendUrl + 'Defis/Utilisateur/'  + this.user.id + '/Like/' + sort).pipe(
            tap((quizzs) => {
                if(quizzs) {
                    this._quizzs.next(quizzs);

                    return quizzs;
                }
            })
        );
    }


    /**
     * Create quizz
     */
    createQuizz(name: string, description :string): Observable<Quizz>
    {
        return this.quizzs$.pipe(
            take(1),
            switchMap(quizzs =>
                this._httpClient.post<any>(environment.backendUrl + 'Defis',
                    {
                        nom         : name,
                        description  : description,
                        utilisateurId  : this.user.id,
                        }
                ).pipe(
                    map((response) => {

                        if(response) {
                            // Update the quizzs with the new quizz
                            this._quizzs.next([response, ...quizzs]);

                            // Return the new quizz from observable
                            return response;
                        }
                    })
                ))
        );
    }

    /**
     * Like quizz
     */
    likeQuizz(quizz): Observable<Quizz>
    {
        return this.quizzs$.pipe(
            take(1),
            switchMap(quizzs =>
                this._httpClient.post<any>(environment.backendUrl + 'Likes',
                    {
                        defiId  : quizz.id,
                        utilisateurId  : this.user.id,
                        }
                ).pipe(
                    map((response) => {
                        if(response) {
                            // Get the quizzs value
                            const quizzs1 = this._quizzs.value;

                            // Find the index of the updated quizz
                            const indexQuizz = quizzs1.findIndex(item => item.id === quizz.id);

                            // Update the like state
                            quizzs1[indexQuizz].like = false;
                            quizzs1[indexQuizz].likeId = response.id;

                            // Update the quizz
                            this._quizzs.next(quizzs1);

                            return quizzs1;
                        }else{
                            return response;
                        }
                    })
                ))
        );
    }

    /**
     * UnLike quizz
     */
    unlikeQuizz(quizz): Observable<Quizz>
    {
        return this.quizzs$.pipe(
            take(1),
            switchMap(quizzs =>
                this._httpClient.delete<any>(environment.backendUrl + 'Likes/' + quizz.likeId,
                ).pipe(
                    map((response) => {

                        if(response) {
                            // Get the quizzs value
                            const quizzs1 = this._quizzs.value;

                            // Find the index of the updated quizz
                            const indexQuizz = quizzs1.findIndex(item => item.id === quizz.id);

                            // Update the like state
                            quizzs1[indexQuizz].like = true;

                            // Update the quizz
                            this._quizzs.next(quizzs1);

                            return quizzs1;
                        }else{
                            return response;
                        }
                    })
                ))
        );
    }



    /**
     * Hide/UnHide quizz
     */
    toggleHideQuizz(quizz, hideState: boolean): Observable<Quizz>
    {
        return this.quizzs$.pipe(
            take(1),
            switchMap(quizzs =>
                this._httpClient.put<any>(environment.backendUrl + 'Defis/' + quizz.id + '/Utilisateur/' + this.user.id ,
                    {
                        cache  : hideState
                    }
                ).pipe(
                    map((response) => {
                        if(response) {
                            // Get the quizzs value
                            const quizzs1 = this._quizzs.value;

                            // Find the index of the updated quizz
                            const indexQuizz = quizzs1.findIndex(item => item.id === quizz.id);

                            // Update the hide state
                            quizzs1[indexQuizz].cache = true;

                            // Update the quizz
                            this._quizzs.next(quizzs1);

                            return quizzs1;
                        }else{
                            return response;
                        }
                    })
                ))
        );
    }


    /**
     * Realised quizz
     */
    realisedQuizz(quizz): Observable<Quizz>
    {
        return this.quizzs$.pipe(
            take(1),
            switchMap(quizzs =>
                this._httpClient.post<any>(environment.backendUrl + 'DefisRealises',
                    {
                        defiId  : quizz.id,
                        utilisateurId  : this.user.id,
                    }
                ).pipe(
                    map((response) => {
                        if(response) {
                            // Get the quizzs value
                            const quizzs1 = this._quizzs.value;

                            // Find the index of the updated quizz
                            const indexQuizz = quizzs1.findIndex(item => item.id === quizz.id);

                            // Update the comments
                            quizzs1[indexQuizz].realise = false;
                            quizzs1[indexQuizz].realiseId = response.id;

                            // Update the quizz
                            this._quizzs.next(quizzs1);

                            return quizzs1;
                        }else{
                            return response;
                        }
                    })
                ))
        );
    }

    /**
     * UnRealised quizz
     */
    unrealisedQuizz(quizz): Observable<Quizz>
    {
        return this.quizzs$.pipe(
            take(1),
            switchMap(quizzs =>
                this._httpClient.delete<any>(environment.backendUrl + 'DefisRealises/' + quizz.realiseId,
                ).pipe(
                    map((response) => {

                        if(response) {
                            // Get the quizzs value
                            const quizzs1 = this._quizzs.value;

                            // Find the index of the updated quizz
                            const indexQuizz = quizzs1.findIndex(item => item.id === quizz.id);

                            // Update the like state
                            quizzs1[indexQuizz].realise = true;

                            // Update the quizz
                            this._quizzs.next(quizzs1);

                            return quizzs1;
                        }else{
                            return response;
                        }
                    })
                ))
        );
    }

    /**
     * Create comment
     */
    createComment(text: string, quizzId :string): Observable<Quizz>
    {
        return this.quizzs$.pipe(
            take(1),
            switchMap(quizzs =>
                this._httpClient.post<any>(environment.backendUrl + 'Commentaires',
                    {
                        texte          : text,
                        defiId         : quizzId,
                        utilisateurId  : this.user.id,
                        }
                ).pipe(
                    map((response) => {

                        if(response) {

                            // Get the quizzs value
                            const quizzs1 = this._quizzs.value;

                            // Find the index of the updated quizz
                            const indexQuizz = quizzs1.findIndex(item => item.id === quizzId);

                            // Update the comments
                            quizzs1[indexQuizz].commentaires.push(response);

                            // Update the quizz
                            this._quizzs.next(quizzs1);

                            // Update the quizzs with the new quizz
                            this._quizzs.next([response, ...quizzs]);

                            // Return the new quizz from observable
                            return response;
                        }
                    })
                ))
        );
    }


    /**
     * Delete quizz
     *
     * @param quizz
     */
    deleteQuizz(quizz): Observable<boolean>
    {
        return this.quizzs$.pipe(
            take(1),
            switchMap(quizzs => this._httpClient.delete(environment.backendUrl + 'Defis/' + quizz.id, ).pipe(
                map((isDeleted: boolean) => {

                    // Find the index of the deleted quizz
                    const index = quizzs.findIndex(item => item.id === quizz.id);

                    // Delete the quizz
                    quizzs.splice(index, 1);

                    // Update the quizzs
                    this._quizzs.next(quizzs);

                    // Return the deleted status
                    return isDeleted;
                })
            ))
        );
    }

}
