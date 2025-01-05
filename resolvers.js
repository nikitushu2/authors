const { GraphQLError } = require('graphql')
const jwt = require('jsonwebtoken')
const Author = require('./models/author.js')
const Book = require('./models/book.js')
const User = require('./models/user.js')
const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()

const resolvers = {
    Query: {
        authorCount: async () => Author.countDocuments(),
        bookCount: async () => Book.countDocuments(),
        allAuthors: async () => {
            console.log('Author.find')
            return Author.find({})
        },
        allBooks: async (root, args) => {
            let query = {};
            if (args.author) {
                const author = await Author.findOne({ name: args.author });
                if (author) query.author = author._id;
            }
            if (args.genre) {
                query.genres = args.genre;
            }
            return Book.find(query).populate('author');
        },
        me: (root, args, context) => {
            return context.currentUser
        },
    },
    Author: {
        bookCount: async (parent) => {
            return Book.countDocuments({ author: parent._id });
        },
    },
    Mutation: {
        addBook: async (root, args) => {
            let author = await Author.findOne({ name: args.author });

            if (!author) {
                author = new Author({ name: args.author });
                await author.save();
            }

            const book = new Book({
                title: args.title,
                published: args.published,
                genres: args.genres,
                author: author._id,
            });

            try {
                await book.save();
            } catch (error) {
                throw new GraphQLError('Failed to save book', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        invalidArgs: args,
                        error,
                    },
                });
            }

            pubsub.publish('BOOK_ADDED', { bookAdded: book })

            return book.populate('author');
        },

        editAuthor: async (root, args) => {
            const author = await Author.findOne({ name: args.name });

            if (!author) {
                return null;
            }

            author.born = args.setBornTo;

            try {
                await author.save();
            } catch (error) {
                throw new GraphQLError('Failed to edit author', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        invalidArgs: args,
                        error,
                    },
                });
            }

            return author;
        },

        createUser: async (root, args) => {
            const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre })

            return user.save()
                .catch(error => {
                    throw new GraphQLError('Creating the user failed', {
                        extensions: {
                            code: 'BAD_USER_INPUT',
                            invalidArgs: args.username,
                            error
                        }
                    })
                })
        },

        login: async (root, args) => {
            const user = await User.findOne({ username: args.username })

            if (!user || args.password !== 'secret') {
                throw new GraphQLError('wrong credentials', {
                    extensions: {
                        code: 'BAD_USER_INPUT'
                    }
                })
            }

            const userForToken = {
                username: user.username,
                id: user._id,
            }

            return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
        },
    },
    Subscription: {
        bookAdded: {
            subscribe: () => {
                return pubsub.asyncIterableIterator('BOOK_ADDED')
            }
        },
    },
};

module.exports = resolvers