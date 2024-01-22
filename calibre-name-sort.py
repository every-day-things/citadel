#: Author sort name algorithm
# The algorithm used to copy author to author_sort.
# Possible values are:
#  invert: use "fn ln" -> "ln, fn"
#  copy  : copy author to author_sort without modification
#  comma : use 'copy' if there is a ',' in the name, otherwise use 'invert'
#  nocomma : "fn ln" -> "ln fn" (without the comma)
# When this tweak is changed, the author_sort values stored with each author
# must be recomputed by right-clicking on an author in the left-hand tags
# panel, selecting 'Manage authors', and pressing
# 'Recalculate all author sort values'.
#
# The author_name_suffixes are words that are ignored when they occur at the
# end of an author name. The case of the suffix is ignored and trailing
# periods are automatically handled.
#
# The same is true for author_name_prefixes.
#
# The author_name_copywords are a set of words which, if they occur in an
# author name, cause the automatically generated author sort string to be
# identical to the author's name. This means that the sort for a string like
# "Acme Inc." will be "Acme Inc." instead of "Inc., Acme".
#
# If author_use_surname_prefixes is enabled, any of the words in
# author_surname_prefixes will be treated as a prefix to the surname, if they
# occur before the surname. So for example, "John von Neumann" would be sorted
# as "von Neumann, John" and not "Neumann, John von".

author_sort_copy_method = 'comma'
author_name_suffixes = ('Jr', 'Sr', 'Inc', 'Ph.D', 'Phd',
                        'MD', 'M.D', 'I', 'II', 'III', 'IV',
                        'Junior', 'Senior')
author_name_prefixes = ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof')
author_name_copywords = (
    'Agency', 'Corporation', 'Company', 'Co.', 'Council',
    'Committee', 'Inc.', 'Institute', 'National', 'Society', 'Club', 'Team',
    'Software', 'Games', 'Entertainment', 'Media', 'Studios',
)
author_use_surname_prefixes = False
author_surname_prefixes = ('da', 'de', 'di', 'la', 'le', 'van', 'von')

tweaks = {
    'author_sort_copy_method': author_sort_copy_method,
    'author_name_suffixes': author_name_suffixes,
    'author_name_prefixes': author_name_prefixes,
    'author_name_copywords': author_name_copywords,
    'author_use_surname_prefixes': author_use_surname_prefixes,
    'author_surname_prefixes': author_surname_prefixes,
}

def force_unicode(s):
  return s

### Real Calibre code

# From polyglot builtins
def iteritems(d):
    return iter(d.items())

def remove_bracketed_text(src, brackets=None):
    if brackets is None:
        brackets = {'(': ')', '[': ']', '{': '}'}
    from collections import Counter
    counts = Counter()
    total = 0
    buf = []
    src = force_unicode(src)
    rmap = {v: k for k, v in iteritems(brackets)}
    for char in src:
        if char in brackets:
            counts[char] += 1
            total += 1
        elif char in rmap:
            idx = rmap[char]
            if counts[idx] > 0:
                counts[idx] -= 1
                total -= 1
        elif total < 1:
            buf.append(char)
    return ''.join(buf)

def author_to_author_sort(
        author,
        method=None,
        copywords=None,
        use_surname_prefixes=None,
        surname_prefixes=None,
        name_prefixes=None,
        name_suffixes=None
):
    if not author:
        return ''

    if method is None:
        method = tweaks['author_sort_copy_method']
    if method == 'copy':
        return author

    sauthor = remove_bracketed_text(author).strip()
    if method == 'comma' and ',' in sauthor:
        return author

    tokens = sauthor.split()
    if len(tokens) < 2:
        return author

    ltoks = frozenset(x.lower() for x in tokens)
    copy_words = frozenset(x.lower() for x in (tweaks['author_name_copywords'] if copywords is None else copywords))
    if ltoks.intersection(copy_words):
        return author

    author_use_surname_prefixes = tweaks['author_use_surname_prefixes'] if use_surname_prefixes is None else use_surname_prefixes
    if author_use_surname_prefixes:
        author_surname_prefixes = frozenset(x.lower() for x in (tweaks['author_surname_prefixes'] if surname_prefixes is None else surname_prefixes))
        if len(tokens) == 2 and tokens[0].lower() in author_surname_prefixes:
            return author

    prefixes = {force_unicode(y).lower() for y in (tweaks['author_name_prefixes'] if name_prefixes is None else name_prefixes)}
    prefixes |= {y+'.' for y in prefixes}

    for first in range(len(tokens)):
        if tokens[first].lower() not in prefixes:
            break
    else:
        return author

    suffixes = {force_unicode(y).lower() for y in (tweaks['author_name_suffixes'] if name_suffixes is None else name_suffixes)}
    suffixes |= {y+'.' for y in suffixes}

    for last in range(len(tokens) - 1, first - 1, -1):
        if tokens[last].lower() not in suffixes:
            break
    else:
        return author

    suffix = ' '.join(tokens[last + 1:])

    print("first:", first, "last:", last, "suffix:", suffix, "tokens:", tokens)

    if author_use_surname_prefixes:
        if last > first and tokens[last - 1].lower() in author_surname_prefixes:
            tokens[last - 1] += ' ' + tokens[last]
            last -= 1

    atokens = tokens[last:last + 1] + tokens[first:last]
    num_toks = len(atokens)
    if suffix:
        atokens.append(suffix)

    if method != 'nocomma' and num_toks > 1:
        atokens[0] += ','

    return ' '.join(atokens)

if __name__ == '__main__':
    test_cases = [
        "Dr. John Doe",
        "John Doe",
        "John Doe Jr.",
        "John Doe II",
        "John Doe Inc.",
        "John (Brockheimer) Doe",
    ]
    for test_case in test_cases:
        print(test_case, " → ", author_to_author_sort(test_case))