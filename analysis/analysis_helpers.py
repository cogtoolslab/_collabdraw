from __future__ import division

import os
import json

import os
import pandas as pd
import numpy as np
from numpy import shape
from PIL import Image
import base64

import scipy.stats as stats
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import seaborn as sns
import re
from scipy.stats import norm
from IPython.display import clear_output


## seaborn plotting parameters
sns.set_context('poster')
colors = sns.color_palette("cubehelix", 5)

# directory & file hierarchy
proj_dir = os.path.abspath('..')
analysis_dir = os.getcwd()
results_dir = os.path.join(proj_dir,'results')

def convert_numeric(X,column_id):
    ## make numeric types for aggregation
    X[column_id] = pd.to_numeric(X[column_id])
    return X

def compute_confusion_matrix(M,class_list,
                             groupby=['condition'],
                             ground_truth = 'className',
                             prediction = 'response'):
    '''
    input: M : dataframe, 
           class_list : list of categories (length n)
    output: confusion : nxn counts
            norm : nxn proportions
    
    '''    
    ## init counter
    counter = 1
    
    ## get number of groups
    g = M.groupby(groupby)
    ngroups = g.ngroups
    
    ## init figure
    sns.set_context('talk')
    height = 8
    width = height * ngroups + height
    fig = plt.figure(figsize=(width,height), dpi = 80)
    
    ## init Confusion/Norm dictionaries
    Confusion = {}
    Norm = {}    
    
    for name, group in M.groupby(groupby):        

        ## counts-based confusion matrix: rows is ground truth, columns is response
        confusion = np.zeros((len(class_list),len(class_list)))        
        for i,m in group.iterrows():  
            if i%100==0:
                print 'Analyzing {} of {} rows'.format(i,group.shape[0])
                clear_output(wait=True)
            resp_ind = np.where(class_list==m[prediction])[0][0]
            targ_ind = np.where(class_list==m[ground_truth])[0][0]
            confusion[targ_ind][resp_ind] += 1

        ## normalize counts in confusion matrix to get proportions
        norm = np.zeros((len(class_list),len(class_list)))
        for i,row in enumerate(confusion):
            norm[i,:] = row/np.sum(row)
            
            
        ## plot confusion matrix
        norm_ = np.round(norm,2)
        ax = plt.subplot(1,ngroups,counter)
        sns.heatmap(norm_,vmin=0,vmax=1,square=True,annot=True)
        t = plt.yticks(range(len(class_list)), class_list, fontsize=16,rotation='horizontal')
        t = plt.xticks(range(len(class_list)), class_list, fontsize=16,rotation='vertical')
        plt.title(name)
        
        plt.tick_params(
            axis='x',          # changes apply to the x-axis
            which='both',      # both major and minor ticks are affected
            bottom=False,      # ticks along the bottom edge are off
            top=False,         # ticks along the top edge are off
            labelbottom=False) # labels along the bottom edge are off        
        
        Confusion[name] = confusion
        Norm[name] = norm
        counter += 1
        
    return Confusion, Norm

def dprime(A, B=None, mode='binary',\
        max_value=np.inf, min_value=-np.inf,\
        max_ppf_value=np.inf, min_ppf_value=-np.inf,\
        **kwargs):
    """
    from: https://github.com/cogtoolslab/bangmetric
    Computes the d-prime sensitivity index of predictions
    from various data formats.  Depending on the choice of
    `mode`, this function can take one of the following format:

    * Binary classification outputs (`mode='binary'`; default)
    * Positive and negative samples (`mode='sample'`)
    * True positive and false positive rate (`mode='rate'`)
    * Confusion matrix (`mode='confusionmat'`)

    Parameters
    ----------
    A, B:
        If `mode` is 'binary' (default):

            A: array, shape = [n_samples],
                True values, interpreted as strictly positive or not
                (i.e. converted to binary).
                Could be in {-1, +1} or {0, 1} or {False, True}.

            B: array, shape = [n_samples],
                Predicted values (real).

        If `mode` is 'sample':

            A: array-like,
                Positive sample values (e.g., raw projection values
                of the positive classifier).

            B: array-like,
                Negative sample values.

        If `mode` is 'rate':

            A: array-like, shape = [n_groupings]
                True positive rates

            B: array-like, shape = [n_groupings]
                False positive rates

        if `mode` is 'confusionmat':

            A: array-like, shape = [n_classes (true), n_classes (pred)]
                Confusion matrix, where the element M_{rc} means
                the number of times when the classifier or subject
                guesses that a test sample in the r-th class
                belongs to the c-th class.

            B: ignored

    mode: {'binary', 'sample', 'rate'}, optional, (default='binary')
        Directs the interpretation of A and B.

    max_value: float, optional (default=np.inf)
        Maximum possible d-prime value.

    min_value: float, optional (default=-np.inf)
        Minimum possible d-prime value.

    max_ppf_value: float, optional (default=np.inf)
        Maximum possible ppf value.
        Used only when mode is 'rate' or 'confusionmat'.

    min_ppf_value: float, optional (default=-np.inf).
        Minimum possible ppf value.
        Used only when mode is 'rate' or 'confusionmat'.

    kwargs: named arguments, optional
        Passed to ``confusion_matrix_stats()`` and used only when `mode`
        is 'confusionmat'.  By assigning ``collation``,
        ``fudge_mode``, ``fudge_factor``, etc. one can
        change the behavior of d-prime computation
        (see ``confusion_matrix_stats()`` for details).

    Returns
    -------
    dp: float or array of shape = [n_groupings]
        A d-prime value or array of d-primes, where each element
        corresponds to each grouping of positives and negatives
        (when `mode` is 'rate' or 'confusionmat')

    References
    ----------
    http://en.wikipedia.org/wiki/D'
    http://en.wikipedia.org/wiki/Confusion_matrix
    """

    # -- basic checks and conversion
    if mode == 'sample':
        pos, neg = np.array(A), np.array(B)

    elif mode == 'binary':
        y_true, y_pred = A, B

        assert len(y_true) == len(y_pred)
        assert np.isfinite(y_true).all()

        y_true = np.array(y_true)
        assert y_true.ndim == 1

        y_pred = np.array(y_pred)
        assert y_pred.ndim == 1

        i_pos = y_true > 0
        i_neg = ~i_pos

        pos = y_pred[i_pos]
        neg = y_pred[i_neg]

    elif mode == 'rate':
        TPR, FPR = np.array(A), np.array(B)
        assert TPR.shape == FPR.shape

    elif mode == 'confusionmat':
        # A: confusion mat
        # row means true classes, col means predicted classes
        P, N, TP, _, FP, _ = confusion_matrix_stats(A, **kwargs)

        TPR = TP / P
        FPR = FP / N

    else:
        raise ValueError('Invalid mode')

    # -- compute d'
    if mode in ['sample', 'binary']:
        assert np.isfinite(pos).all()
        assert np.isfinite(neg).all()

        if pos.size <= 1:
            raise ValueError('Not enough positive samples'\
                    'to estimate the variance')
        if neg.size <= 1:
            raise ValueError('Not enough negative samples'\
                    'to estimate the variance')

        pos_mean = pos.mean()
        neg_mean = neg.mean()
        pos_var = pos.var(ddof=1)
        neg_var = neg.var(ddof=1)

        num = pos_mean - neg_mean
        div = np.sqrt((pos_var + neg_var) / 2.)

        dp = num / div

    else:   # mode is rate or confusionmat
        ppfTPR = norm.ppf(TPR)
        ppfFPR = norm.ppf(FPR)
        ppfTPR = np.clip(ppfTPR, min_ppf_value, max_ppf_value)
        ppfFPR = np.clip(ppfFPR, min_ppf_value, max_ppf_value)
        dp = ppfTPR - ppfFPR

    # from Dan's suggestion about clipping d' values...
    dp = np.clip(dp, min_value, max_value)

    return dp

def confusion_matrix_stats(M, collation=None, \
        fudge_mode='correction', fudge_factor=0.5):
    """
    from: https://github.com/cogtoolslab/bangmetric
    
    Computes classification statistics of sub-confusion matrices inside
    the given original confusion matrix M.  If no ``collation`` is given,
    statistics for each one vs. rest sub-confusion matrix will be computed.

    Parameters
    ----------
    M: array-like, shape = [n_classes (true), n_classes (pred)]
        Confusion matrix, where the element M_{rc} means the number of
        times when the classifier guesses that a test sample in the r-th class
        belongs to the c-th class.

    collation: None or array-like of shape = [n_groupings,
        n_classes], optional (default=None)
        Defines how to group entries in `M` to make sub-confusion matrices.
        Entries shoule be {+1, 0, -1}.  A row defines one instance of grouping,
        where +1, -1, and 0 designate the corresponding class as a
        positive, negative, and ignored class, respectively.  For example,
        the following `collation` defines a 3-way one vs. rest grouping
        (given that `M` is a 3x3 matrix):
            [[+1, -1, -1],
             [-1, +1, -1],
             [-1, -1, +1]]
        If `None` (default), one vs. rest grouping is assumed.

    fudge_factor: float, optional (default=0.5)
        A small factor to avoid TPR, FPR, TNR, or FNR becoming 0 or 1.
        Mostly intended for d-prime calculation.

    fudge_mode: str, optional (default='correction')
        Determins how to apply the fudge factor.  Can be one of:
            'correction': apply only when needed
            'always': always apply the fudge factor
            'none': no fudging --- equivalent to ``fudge_factor=0``

    Returns
    -------
    P: array, shape = [n_groupings]
        Array of the number of positives, where each element corresponds to
        each grouping (row) defined by `collation`.
    N: array, shape = [n_groupings]
        Same as P, except that this is an array of the number of negatives.
    TP: array, shape = [n_groupings]
        Same as P, except an array of the number of true positives.
    TN: array, shape = [n_groupings]
        Same as P, except an array of the number of true negatives.
    FP: array, shape = [n_groupings]
        Same as P, except an array of the number of false positives.
    FN: array, shape = [n_groupings]
        Same as P, except an array of the number of false negatives.

    References
    ----------
    http://en.wikipedia.org/wiki/Confusion_matrix
    http://en.wikipedia.org/wiki/Receiver_operating_characteristic
    """

    DTYPE = np.float64

    # M: confusion matrix, row means true classes, col means predicted classes
    M = np.array(M)
    assert M.ndim == 2
    assert M.shape[0] == M.shape[1]
    n_classes = M.shape[0]

    if collation is None:
        # make it one vs. rest.  E.g., for a 3-classes case:
        #  [[+1, -1, -1],
        #   [-1, +1, -1],
        #   [-1, -1, +1]]
        collation = -np.ones((n_classes, n_classes), dtype='int8')
        collation += 2 * np.eye(n_classes, dtype='int8')
    else:
        collation = np.array(collation, dtype='int8')
        assert collation.ndim == 2
        assert collation.shape[1] == n_classes

    # P0: number of positives, for each class
    # P: number of positives, for each grouping
    # N: number of negatives, for each grouping
    # TP: number of true positives, for each grouping
    # FP: number of false positives, for each grouping
    P0 = np.sum(M, axis=1)
    P = np.array([np.sum(P0[coll == +1]) \
            for coll in collation], dtype=DTYPE)
    N = np.array([np.sum(P0[coll == -1]) \
            for coll in collation], dtype=DTYPE)
    TP = np.array([np.sum(M[coll == +1][:, coll == +1]) \
            for coll in collation], dtype=DTYPE)
    TN = np.array([np.sum(M[coll == -1][:, coll == -1]) \
            for coll in collation], dtype=DTYPE)
    FP = np.array([np.sum(M[coll == -1][:, coll == +1]) \
            for coll in collation], dtype=DTYPE)
    FN = np.array([np.sum(M[coll == +1][:, coll == -1]) \
            for coll in collation], dtype=DTYPE)

    # -- application of fudge factor
    if fudge_mode == 'none':           # no fudging
        pass

    elif fudge_mode == 'always':       # always apply fudge factor
        TP += fudge_factor
        FP += fudge_factor
        TN += fudge_factor
        FN += fudge_factor
        P += 2. * fudge_factor
        N += 2. * fudge_factor

    elif fudge_mode == 'correction':   # apply fudge factor only when needed
        TP[TP == P] = P[TP == P] - fudge_factor    # 100% correct
        TP[TP == 0] = fudge_factor                 # 0% correct
        FP[FP == N] = N[FP == N] - fudge_factor    # always FAR
        FP[FP == 0] = fudge_factor                 # no false alarm

        TN[TN == N] = N[TN == N] - fudge_factor
        TN[TN == 0] = fudge_factor
        FN[FN == P] = P[FN == P] - fudge_factor
        FN[FN == 0] = fudge_factor

    else:
        raise ValueError('Invalid fudge_mode')

    # -- done
    return P, N, TP, TN, FP, FN
